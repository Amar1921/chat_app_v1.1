#!/usr/bin/env bash
set -euo pipefail
# Exécuté sur le VPS avec le chemin du paquet déjà transféré et sa révision Git.
release=${1:?Chemin de la release requis}
revision=${2:?Révision Git requise}
app=/var/www/chat
backup="$app/backups/$(date -u +%Y%m%dT%H%M%SZ)-$revision"
mkdir -p "$backup"
chmod 700 "$app/backups" "$backup"
tar -C "$app" --exclude=backend/node_modules -czf "$backup/application.tar.gz" backend frontend/dist
chmod 600 "$backup/application.tar.gz"
if [[ -f "$app/package.json" ]]; then cp "$app/package.json" "$backup/package.json"; fi
rollback() {
  trap - ERR
  echo "Échec : restauration de la version précédente."
  tar -C "$app" -xzf "$backup/application.tar.gz"
  if [[ -f "$backup/package.json" ]]; then cp "$backup/package.json" "$app/package.json"; fi
  pm2 delete chat-backend >/dev/null
  NODE_ENV=production pm2 start "$app/backend/server.js" --name chat-backend --cwd "$app/backend" >/dev/null
  exit 1
}
trap rollback ERR
# Migrer les valeurs du serveur sur place ; aucun secret ne transite vers le Mac.
cd "$app/backend"
node --input-type=module - <<'JS'
import fs from 'node:fs';
import dotenv from 'dotenv';
const file='.env.production';
const original=fs.readFileSync(fs.existsSync(file)?file:'.env','utf8');
const before=dotenv.parse(original);
let updated=original.replace(/^VITE_.*$/gm,'# Variable frontend déplacée vers la configuration Vite.');
for(const [key,value] of Object.entries({NODE_ENV:'production',FRONTEND_URL:'https://chat.amarsyll.pro'})) {
  const pattern=new RegExp('^'+key+'=.*$','gm');
  updated=pattern.test(updated)?updated.replace(pattern,key+'='+value):updated+'\n'+key+'='+value+'\n';
}
const after=dotenv.parse(updated);
for(const key of ['DB_PASSWORD','JWT_SECRET','JWT_REFRESH_SECRET','DEEPSEEK_API_KEY']) {
  if(before[key]!==after[key])throw Error('La migration doit préserver '+key);
}
fs.writeFileSync(file,updated,{mode:0o600});
fs.chmodSync(file,0o600);
JS
rsync -a "$release/backend/" "$app/backend/"
cp "$release/package.json" "$app/package.json"
# Vérifier avant le redémarrage que la configuration de production se charge.
NODE_ENV=production node --input-type=module -e "await import('./config/env.js'); console.log('Configuration production validée')"
node --input-type=module - "$app" "$revision" <<'JS'
import fs from 'node:fs';
const app=process.argv[2],revision=process.argv[3];
const config={apps:[{name:'chat-backend',script:app+'/backend/start.js',args:'production',cwd:app,env:{NODE_ENV:'production',DEPLOY_REVISION:revision}}]};
fs.writeFileSync(app+'/ecosystem.config.json',JSON.stringify(config,null,2)+'\n');
JS
pm2 delete chat-backend >/dev/null
pm2 start "$app/ecosystem.config.json" --only chat-backend >/dev/null
for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:5001/api/health > "$backup/health.json"; then break; fi
  sleep 1
done
node --input-type=module - "$backup/health.json" "$revision" <<'JS'
import fs from 'node:fs';
const health=JSON.parse(fs.readFileSync(process.argv[2]));
if(health.status!=='ok'||health.version!=='1.1.0'||health.revision!==process.argv[3])throw Error('La nouvelle version ne répond pas correctement');
console.log(JSON.stringify(health));
JS
# Remplacer index.html après la copie des nouveaux assets ; conserver les anciens
# assets pour les onglets déjà ouverts, jusqu'à un nettoyage de maintenance.
rsync -a --exclude=index.html "$release/dist/" "$app/frontend/dist/"
cp "$release/dist/index.html" "$app/frontend/dist/index.html"
pm2 save >/dev/null
trap - ERR
echo "Déploiement réussi ; sauvegarde : $backup"
