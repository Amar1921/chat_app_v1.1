-- MySQL 8.0.19+ ; importer dans docmanager. Aucun secret.
SET NAMES utf8mb4;
INSERT INTO `documentation` (`title`, `slug`, `summary`, `content`, `category`, `status`, `priority`, `tags`, `project_name`, `project_url`, `repo_url`, `tech_stack`, `env_variables`, `file_paths`, `commands`, `ports`, `credentials`, `deploy_steps`, `known_issues`, `version`, `notes`, `is_public`, `is_pinned`, `created_by`, `created_at`)
VALUES (
'Chat IA — architecture et audit',
'configuration-chat-app-v1-1',
'Chat DeepSeek React/Express/MySQL ; correction du flux UTF-8 et de trois lectures entre utilisateurs. Renouvellement JWT et validation des entrées à sécuriser.',
'<h2>Architecture</h2><p>React/Vite/Material UI → Express/JWT → MySQL utf8mb4 ; Express appelle DeepSeek par HTTPS et renvoie un flux SSE.</p><h2>Configuration serveur</h2><p>VirtualHost Apache : vérifié sur le VPS, référence dans deploy/apache-vhost.reference.conf. Racine /var/www/chat/frontend/dist ; proxy /api vers 127.0.0.1:5001. Backend PM2 chat-backend dans /var/www/chat/backend. Pool PHP-FPM : non applicable à cette application Node.js. Crontab et logrotate : aucun fichier fourni, état du serveur inconnu.</p><h2>Environnement sans secrets</h2><pre>.env.development : VITE_API_URL=http://localhost:5002/api
.env.production : VITE_API_URL=/api
backend/.env.development : PORT=5002
backend/.env.development : NODE_ENV=development
backend/.env.development : DB_HOST=127.0.0.1
backend/.env.development : DB_PORT=3307
backend/.env.development : DB_USER=syll_amar
backend/.env.development : DB_PASSWORD=[MASQUÉ]
backend/.env.development : DB_NAME=chat_ia
backend/.env.development : JWT_SECRET=[MASQUÉ]
backend/.env.development : JWT_EXPIRES_IN=7d
backend/.env.development : DEEPSEEK_API_KEY=[MASQUÉ]
backend/.env.development : DEEPSEEK_API_URL=https://api.deepseek.com/v1
backend/.env.development : FRONTEND_URL=http://localhost:5173
backend/.env.development : JWT_REFRESH_SECRET=[MASQUÉ]
backend/.env.production : NODE_ENV=production
backend/.env.production : PORT=5001
backend/.env.production : DB_HOST=127.0.0.1
backend/.env.production : DB_PORT=3306
backend/.env.production : DB_USER=chat_ia
backend/.env.production : DB_PASSWORD=[MASQUÉ]
backend/.env.production : DB_NAME=chat_ia
backend/.env.production : JWT_SECRET=[MASQUÉ]
backend/.env.production : JWT_REFRESH_SECRET=[MASQUÉ]
backend/.env.production : JWT_EXPIRES_IN=7d
backend/.env.production : DEEPSEEK_API_KEY=[MASQUÉ]
backend/.env.production : DEEPSEEK_API_URL=https://api.deepseek.com/v1
backend/.env.production : FRONTEND_URL=https://chat.amarsyll.pro</pre><h3>package.json</h3><pre>{
  &quot;name&quot;: &quot;chat_app_v1.0&quot;,
  &quot;private&quot;: true,
  &quot;version&quot;: &quot;1.1.0&quot;,
  &quot;type&quot;: &quot;module&quot;,
  &quot;scripts&quot;: {
    &quot;dev&quot;: &quot;vite --mode development&quot;,
    &quot;build&quot;: &quot;vite build --mode production&quot;,
    &quot;lint&quot;: &quot;eslint .&quot;,
    &quot;preview&quot;: &quot;vite preview&quot;,
    &quot;start:server&quot;: &quot;node backend/start.js production&quot;,
    &quot;dev:server&quot;: &quot;nodemon --watch backend --ext js --exec \\&quot;node backend/start.js development\\&quot;&quot;,
    &quot;build:dev&quot;: &quot;vite build --mode development --outDir dist-dev&quot;
  },
  &quot;dependencies&quot;: {
    &quot;react&quot;: &quot;^19.2.0&quot;,
    &quot;react-dom&quot;: &quot;^19.2.0&quot;,
    &quot;axios&quot;: &quot;^1.6.2&quot;,
    &quot;bcryptjs&quot;: &quot;^2.4.3&quot;,
    &quot;cors&quot;: &quot;^2.8.5&quot;,
    &quot;dotenv&quot;: &quot;^16.3.1&quot;,
    &quot;express&quot;: &quot;^4.18.2&quot;,
    &quot;express-rate-limit&quot;: &quot;^7.1.5&quot;,
    &quot;express-validator&quot;: &quot;^7.3.1&quot;,
    &quot;helmet&quot;: &quot;^7.1.0&quot;,
    &quot;jsonwebtoken&quot;: &quot;^9.0.2&quot;,
    &quot;mysql2&quot;: &quot;^3.6.5&quot;,
    &quot;uuid&quot;: &quot;^9.0.0&quot;,
    &quot;@emotion/react&quot;: &quot;^11.11.1&quot;,
    &quot;@emotion/styled&quot;: &quot;^11.11.0&quot;,
    &quot;@mui/icons-material&quot;: &quot;^5.15.0&quot;,
    &quot;@mui/lab&quot;: &quot;^5.0.0-alpha.158&quot;,
    &quot;@mui/material&quot;: &quot;^5.15.0&quot;,
    &quot;@mui/x-charts&quot;: &quot;^6.18.0&quot;,
    &quot;date-fns&quot;: &quot;^3.0.6&quot;,
    &quot;framer-motion&quot;: &quot;^10.17.0&quot;,
    &quot;highlight.js&quot;: &quot;^11.9.0&quot;,
    &quot;notistack&quot;: &quot;^3.0.1&quot;,
    &quot;react-markdown&quot;: &quot;^9.0.1&quot;,
    &quot;react-router-dom&quot;: &quot;^6.21.1&quot;,
    &quot;react-scripts&quot;: &quot;5.0.1&quot;,
    &quot;react-syntax-highlighter&quot;: &quot;^15.5.0&quot;,
    &quot;recharts&quot;: &quot;^3.7.0&quot;,
    &quot;rehype-highlight&quot;: &quot;^7.0.0&quot;,
    &quot;remark-gfm&quot;: &quot;^4.0.0&quot;
  },
  &quot;devDependencies&quot;: {
    &quot;@eslint/js&quot;: &quot;^9.39.1&quot;,
    &quot;@types/react&quot;: &quot;^19.2.7&quot;,
    &quot;@types/react-dom&quot;: &quot;^19.2.3&quot;,
    &quot;@vitejs/plugin-react&quot;: &quot;^5.1.1&quot;,
    &quot;eslint&quot;: &quot;^9.39.1&quot;,
    &quot;eslint-plugin-react-hooks&quot;: &quot;^7.0.1&quot;,
    &quot;eslint-plugin-react-refresh&quot;: &quot;^0.4.24&quot;,
    &quot;globals&quot;: &quot;^16.5.0&quot;,
    &quot;vite&quot;: &quot;^7.3.1&quot;,
    &quot;nodemon&quot;: &quot;^3.0.2&quot;
  },
  &quot;browserslist&quot;: {
    &quot;production&quot;: [
      &quot;&gt;0.2%&quot;,
      &quot;not dead&quot;,
      &quot;not op_mini all&quot;
    ],
    &quot;development&quot;: [
      &quot;last 1 chrome version&quot;,
      &quot;last 1 firefox version&quot;
    ]
  },
  &quot;proxy&quot;: &quot;http://localhost:5001&quot;
}
</pre><h3>vite.config.js</h3><pre>// vite.config.js
import { defineConfig, loadEnv } from &#x27;vite&#x27;
import react from &#x27;@vitejs/plugin-react&#x27;
import { fileURLToPath } from &#x27;node:url&#x27;

const root = fileURLToPath(new URL(&#x27;.&#x27;, import.meta.url))

export default defineConfig(({ mode }) =&gt; {
  if (![&#x27;development&#x27;, &#x27;production&#x27;].includes(mode)) throw new Error(&#x27;Mode Vite attendu : development ou production.&#x27;)
  const env = loadEnv(mode, root, &#x27;VITE_&#x27;)
  if (!env.VITE_API_URL) throw new Error(`VITE_API_URL manquant dans .env.${mode}`)
  if (mode === &#x27;development&#x27;) {
    const api = new URL(env.VITE_API_URL)
    if (![&#x27;localhost&#x27;, &#x27;127.0.0.1&#x27;, &#x27;[::1]&#x27;].includes(api.hostname)) {
      throw new Error(&#x27;En développement, VITE_API_URL doit viser le backend local. Vérifier .env.development et les variables du terminal.&#x27;)
    }
  }
  console.info(`[frontend] mode=${mode} ; configuration=.env.${mode} ; API=${env.VITE_API_URL}`)
  return {
    envDir: root,
    plugins: [react()],
    server: { port: 5173, strictPort: true },
  }
})
</pre><h3>backend/models/db.js</h3><pre>import mysql from &#x27;mysql2/promise&#x27;;
import &#x27;../config/env.js&#x27;;

const pool = mysql.createPool({
  host: process.env.DB_HOST || &#x27;localhost&#x27;,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || &#x27;root&#x27;,
  password: process.env.DB_PASSWORD || &#x27;&#x27;,
  database: process.env.DB_NAME || &#x27;deepseek_chat&#x27;,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: &#x27;utf8mb4&#x27;,
  timezone: &#x27;+01:00&#x27;,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function transaction(callback) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(&#x27;✅ MySQL connected successfully&#x27;);
    return true;
  } catch (err) {
    console.error(&#x27;❌ MySQL connection failed:&#x27;, err.message);
    return false;
  }
}

export default pool;
</pre><h3>deploy/apache-vhost.reference.conf</h3><pre>&lt;VirtualHost *:443&gt;
    ServerName chat.amarsyll.pro
    DocumentRoot /var/www/chat/frontend/dist

    &lt;Directory /var/www/chat/frontend/dist&gt;
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router — renvoie toutes les routes vers index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    &lt;/Directory&gt;

    # ── Proxy API → Backend Node.js :5001 ────────────────────
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:5001/api
    ProxyPassReverse /api http://127.0.0.1:5001/api

    # ── SSL Configuration ────────────────────────────────────
    SSLEngine on
    Include /etc/letsencrypt/options-ssl-apache.conf

    # ── SSE Streaming — CRITIQUE pour le chat en temps réel ──
    # Sans ça, Apache bufferise les chunks et le streaming ne fonctionne pas
    &lt;Location /api/chat&gt;
        ProxyPass http://127.0.0.1:5001/api/chat
        ProxyPassReverse http://127.0.0.1:5001/api/chat

        # Désactiver la mise en mémoire tampon pour le streaming
        SetEnv proxy-sendchunks 1
        SetEnv proxy-nokeepalive 1

        # Headers pour forcer le streaming
        Header always set X-Accel-Buffering &quot;no&quot;
        Header always set Cache-Control &quot;no-cache&quot;
        Header always set Connection &quot;keep-alive&quot;

        # Configuration supplémentaire pour le streaming
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule /(.*) ws://127.0.0.1:5001/$1 [P,L]
    &lt;/Location&gt;

    # ── WebSocket Support (si nécessaire) ────────────────────


    # ── Logs ──────────────────────────────────────────────────
    ErrorLog ${APACHE_LOG_DIR}/chat.amarsyll.pro-error.log
    CustomLog ${APACHE_LOG_DIR}/chat.amarsyll.pro-access.log combined
    SSLCertificateFile /etc/letsencrypt/live/chat.amarsyll.pro/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/chat.amarsyll.pro/privkey.pem
&lt;/VirtualHost&gt;

# Redirection HTTP → HTTPS
&lt;VirtualHost *:80&gt;
    ServerName chat.amarsyll.pro
    Redirect permanent / https://chat.amarsyll.pro/
RewriteEngine on
RewriteCond %{SERVER_NAME} =chat.amarsyll.pro
RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
&lt;/VirtualHost&gt;
</pre><h3>deploy/activate.sh</h3><pre>#!/usr/bin/env bash
set -euo pipefail
# Exécuté sur le VPS avec le chemin du paquet déjà transféré et sa révision Git.
release=${1:?Chemin de la release requis}
revision=${2:?Révision Git requise}
app=/var/www/chat
backup=&quot;$app/backups/$(date -u +%Y%m%dT%H%M%SZ)-$revision&quot;
mkdir -p &quot;$backup&quot;
chmod 700 &quot;$app/backups&quot; &quot;$backup&quot;
tar -C &quot;$app&quot; --exclude=backend/node_modules -czf &quot;$backup/application.tar.gz&quot; backend frontend/dist
chmod 600 &quot;$backup/application.tar.gz&quot;
if [[ -f &quot;$app/package.json&quot; ]]; then cp &quot;$app/package.json&quot; &quot;$backup/package.json&quot;; fi
rollback() {
  trap - ERR
  echo &quot;Échec : restauration de la version précédente.&quot;
  tar -C &quot;$app&quot; -xzf &quot;$backup/application.tar.gz&quot;
  if [[ -f &quot;$backup/package.json&quot; ]]; then cp &quot;$backup/package.json&quot; &quot;$app/package.json&quot;; fi
  NODE_ENV=production pm2 restart chat-backend --update-env &gt;/dev/null
  exit 1
}
trap rollback ERR
# Migrer les valeurs du serveur sur place ; aucun secret ne transite vers le Mac.
cd &quot;$app/backend&quot;
node --input-type=module - &lt;&lt;&#x27;JS&#x27;
import fs from &#x27;node:fs&#x27;;
import dotenv from &#x27;dotenv&#x27;;
const file=&#x27;.env.production&#x27;;
const original=fs.readFileSync(fs.existsSync(file)?file:&#x27;.env&#x27;,&#x27;utf8&#x27;);
const before=dotenv.parse(original);
let updated=original.replace(/^VITE_.*$/gm,&#x27;# Variable frontend déplacée vers la configuration Vite.&#x27;);
for(const [key,value] of Object.entries({NODE_ENV:&#x27;production&#x27;,FRONTEND_URL:&#x27;https://chat.amarsyll.pro&#x27;})) {
  const pattern=new RegExp(&#x27;^&#x27;+key+&#x27;=.*$&#x27;,&#x27;gm&#x27;);
  updated=pattern.test(updated)?updated.replace(pattern,key+&#x27;=&#x27;+value):updated+&#x27;\\n&#x27;+key+&#x27;=&#x27;+value+&#x27;\\n&#x27;;
}
const after=dotenv.parse(updated);
for(const key of [&#x27;DB_PASSWORD&#x27;,&#x27;JWT_SECRET&#x27;,&#x27;JWT_REFRESH_SECRET&#x27;,&#x27;DEEPSEEK_API_KEY&#x27;]) {
  if(before[key]!==after[key])throw Error(&#x27;La migration doit préserver &#x27;+key);
}
fs.writeFileSync(file,updated,{mode:0o600});
fs.chmodSync(file,0o600);
JS
rsync -a &quot;$release/backend/&quot; &quot;$app/backend/&quot;
cp &quot;$release/package.json&quot; &quot;$app/package.json&quot;
# Vérifier avant le redémarrage que la configuration de production se charge.
NODE_ENV=production node --input-type=module -e &quot;await import(&#x27;./config/env.js&#x27;); console.log(&#x27;Configuration production validée&#x27;)&quot;
NODE_ENV=production DEPLOY_REVISION=&quot;$revision&quot; pm2 restart chat-backend --update-env &gt;/dev/null
for attempt in {1..15}; do
  if curl --fail --silent http://127.0.0.1:5001/api/health &gt; &quot;$backup/health.json&quot;; then break; fi
  sleep 1
done
node --input-type=module - &quot;$backup/health.json&quot; &quot;$revision&quot; &lt;&lt;&#x27;JS&#x27;
import fs from &#x27;node:fs&#x27;;
const health=JSON.parse(fs.readFileSync(process.argv[2]));
if(health.status!==&#x27;ok&#x27;||health.version!==&#x27;1.1.0&#x27;||health.revision!==process.argv[3])throw Error(&#x27;La nouvelle version ne répond pas correctement&#x27;);
console.log(JSON.stringify(health));
JS
# Remplacer index.html après la copie des nouveaux assets ; conserver les anciens
# assets pour les onglets déjà ouverts, jusqu&#x27;à un nettoyage de maintenance.
rsync -a --exclude=index.html &quot;$release/dist/&quot; &quot;$app/frontend/dist/&quot;
cp &quot;$release/dist/index.html&quot; &quot;$app/frontend/dist/index.html&quot;
pm2 save &gt;/dev/null
trap - ERR
echo &quot;Déploiement réussi ; sauvegarde : $backup&quot;
</pre><h2>Environnements</h2><pre># Configuration développement et production

Les commandes s’exécutent à la racine du projet.

| Composant | Commande | Fichier lu | Destination |
|---|---|---|---|
| Frontend de développement | `npm run dev` | `.env.development` | API `http://localhost:5002/api` |
| Backend de développement | `npm run dev:server` | `backend/.env.development` | Port 5002 ; paramètres MySQL repris de l’ancienne configuration |
| Frontend de production | `npm run build` | `.env.production` | `/api`, sur le domaine où le frontend est déployé |
| Backend de production | `npm run start:server` | `backend/.env.production` | Port 5001 par défaut ; configuration à remplir sur le serveur |
| Compilation pour tester localement | `npm run build:dev` | `.env.development` | `dist-dev/`, API locale |

## Développement

Ouvrir deux terminaux :

```bash
npm run dev:server
npm run dev
```

Frontend : http://localhost:5173. Backend : http://localhost:5002/api/health. Le port 5002 évite le conflit observé avec un lecteur multimédia et un ancien backend sur 5001. Le frontend ne change pas automatiquement de port si 5173 est occupé : fermer l’ancien serveur Vite et relancer la commande. Cela garde FRONTEND_URL et CORS cohérents.

Les paramètres MySQL et la clé DeepSeek existants ont été repris dans le fichier backend de développement. Le port MySQL 3307 correspond à votre tunnel existant : cette séparation de fichiers ne crée pas une nouvelle base de données. Pour isoler aussi les données, configurer une base de développement dédiée dans DB_NAME.

Les secrets JWT du développement ont été générés séparément. Se reconnecter après redémarrage du backend ; les anciens jetons locaux ne sont plus valides.

## Production

Le fichier `backend/.env.production` est créé à partir de son exemple. Renseigner DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, DEEPSEEK_API_KEY et vérifier DB_HOST/DB_PORT/DB_USER/DB_NAME sur le serveur. Les secrets du développement ne sont pas recopiés dans ce fichier. Pour garder les sessions de production, conserver les secrets JWT déjà utilisés sur le serveur.

```bash
# Si le fichier privé n’existe pas encore sur le serveur :
cp backend/.env.production.example backend/.env.production
# Éditer backend/.env.production avec les valeurs du serveur.
npm run build
npm run start:server
```

Servir `dist/` et acheminer `/api` vers Express avec le proxy existant. Les variables VITE_* sont incorporées au frontend pendant la compilation : modifier le fichier puis reconstruire et redéployer dist/. Le backend lit sa configuration au démarrage : le redémarrer après modification. Sur le VPS actuel : processus PM2 `chat-backend`, backend `/var/www/chat/backend`, racine Apache `/var/www/chat/frontend/dist`, proxy `/api` vers `127.0.0.1:5001`. Le VirtualHost constaté est conservé dans `deploy/apache-vhost.reference.conf` ; il ne doit pas être réinstallé sans vérification. `deploy/activate.sh` active un paquet préparé, sauvegarde l’application, migre les secrets existants sur place, contrôle la santé et restaure la sauvegarde en cas d’échec.

## Priorité et sécurité des fichiers

- Le backend choisit explicitement development ou production, puis charge uniquement `backend/.env.&lt;mode&gt;`. Il ne lit ni le `.env` racine ni `.env.legacy`. La résolution est indépendante du répertoire de lancement. Un fichier manquant ou une variable indispensable vide bloque le démarrage avec un message qui indique le fichier ou la variable.
- Les variables déjà définies par le terminal, systemd ou l’hébergeur priment sur les valeurs du fichier backend. Le script de lancement fixe NODE_ENV selon sa commande, avant de charger les routes et le pool MySQL.
- Vite utilise ses priorités natives : variables du terminal, `.env.&lt;mode&gt;.local`, `.env.&lt;mode&gt;`, `.env.local`, `.env`. Le `.env` racine contient désormais seulement des commentaires. Aucun `.env.local` n’est fourni. Un VITE_API_URL distant en développement provoque une erreur explicite.
- Les fichiers frontend `.env.development` et `.env.production` ne contiennent que des paramètres publics et sont versionnés. Les deux fichiers backend réels et `.env.legacy` sont ignorés par Git et protégés avec des permissions 600. Les exemples backend, sans secret, sont versionnés.
- Ne jamais placer la clé DeepSeek, les secrets JWT ou les mots de passe MySQL dans une variable VITE_* : ces variables sont accessibles au navigateur.
- `.env.legacy` sauvegarde l’ancienne configuration avant la séparation ; il n’est chargé par aucune commande fournie.

Référence officielle : https://vite.dev/guide/env-and-mode
</pre><h2>Audit et validation</h2><pre># Audit du 1er octobre 2026

Périmètre : code local React/Vite, Express et schémas MySQL. Aucun test offensif sur le site public, aucune lecture des données métier. Les configurations Apache et les tables réellement déployées ne sont pas accessibles dans ce dépôt.

## Texte et encodage — corrigé

`backend/routes/chat.js` utilisait `chunk.toString().split(&#x27;\\n&#x27;)` sans conserver les fragments incomplets. Une coupure au milieu d’un JSON perdait l’événement ; une coupure au milieu d’un accent introduisait des caractères de remplacement. Le nouveau décodeur conserve les octets UTF-8 et les lignes incomplètes. Le flux annonce explicitement UTF-8. La fermeture du flux amont écoute désormais la réponse HTTP, plutôt que la fin de la requête entrante.

Les fichiers inspectés sont lisibles en UTF-8, sans marqueur évident de mauvais réencodage ; le HTML annonce UTF-8, le pool et les schémas annoncent utf8mb4. La configuration réelle des tables existantes reste à vérifier. Aucun remplacement automatique de caractères dans les messages historiques : les fragments déjà perdus ne sont pas récupérables par une conversion d’encodage.

Le rendu Markdown en streaming remplaçait les paragraphes par des spans, collant certains paragraphes. Les paragraphes et leurs marges sont rétablis ; les blocs de code conservent leurs espaces et leur défilement horizontal.

Référence : https://nodejs.org/api/string_decoder.html

## Failles confirmées par lecture du code

| Gravité | Problème | État |
|---|---|---|
| Élevée | `GET /api/conversations/:id/stats` lisait les statistiques sans vérifier le propriétaire. | Corrigé : vérification préalable, 404 pour une conversation étrangère. |
| Élevée | `POST /api/conversations/:id/apply-template` modifiait sous contrôle du propriétaire, mais relisait sans contrôle ; un identifiant étranger pouvait révéler la conversation, son prompt et ses paramètres. | Corrigé : lecture limitée au propriétaire et 404. |
| Moyenne | `PUT /api/stats/folders/:id` renvoyait un dossier étranger même lorsque l’UPDATE n’avait rien modifié. | Corrigé : lecture limitée au propriétaire et 404. |
| Élevée | Le renouvellement JWT ne compare jamais le jeton reçu au jeton stocké. Logout efface une colonne sans révoquer réellement le refresh token ; le changement de mot de passe ne révoque pas les sessions. En l’absence de JWT_REFRESH_SECRET, accès et renouvellement partagent la clé et ne portent aucun type distinct. | À corriger : jetons distincts, renouvellement stocké sous forme de hash, rotation, révocation et migration SQL. |
| Moyenne | Le middleware JWT du module auth ne vérifie pas si le compte est encore actif. Celui des conversations avait le même défaut. | Conversations corrigées par réutilisation du middleware commun ; routes auth encore à harmoniser. |
| Moyenne | Login et register n’ont pas de limite spécifique ; la limite globale autorise 500 requêtes / 15 min / IP. | À corriger : limite dédiée et protection par compte ; vérifier le proxy de production avant de configurer trust proxy. |
| Moyenne | Paramètres de génération, pagination et dossiers insuffisamment validés. Une conversation peut référencer un dossier étranger ; le comptage des dossiers ne filtre pas les conversations par utilisateur. | À corriger : bornes, types, liste de modèles et appartenance du dossier. Le message chat est désormais limité à 32 000 caractères et doit être une chaîne. |
| Moyenne | L’écouteur async de fin du flux ne capturait pas les erreurs de persistance. | Callback protégé et interruption remontée au navigateur ; transaction et sauvegarde des réponses partielles restent à prévoir. |
| Moyenne | Le gestionnaire global renvoie err.message et journalise req.body en développement, ce qui peut inclure des mots de passe. Le frontend comporte aussi des traces de données d’authentification conditionnées par NODE_ENV. | À corriger : réponses génériques, masquage des données sensibles et logs sans corps de requête. |
| Moyenne | Le convertisseur Markdown du presse-papier autorise des liens javascript: ; l’échappement HTML initial ne valide pas le protocole des URL. | À corriger : rendu Markdown avec validation des URL. Ne pas confondre avec un XSS automatique confirmé dans ReactMarkdown, qui n’active pas le HTML brut ici. |

Les identifiants UUID sont difficiles à deviner mais ne remplacent pas les vérifications d’autorisation. Les requêtes inspectées utilisent des paramètres SQL ; aucune injection SQL directe n’a été identifiée dans ce périmètre. Le JWT en localStorage accroît l’impact d’une éventuelle exécution de script ; ce stockage n’est pas à lui seul une preuve de XSS.

Référence : https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html

## Défauts fonctionnels et maintenance

- README désynchronisé : dossiers frontend/backend et scripts de démarrage décrits différemment de package.json ; Vite utilise normalement 5173, alors que FRONTEND_URL d’exemple vaut 3000.
- Plusieurs méthodes de src/utils/api.js appellent des routes inexistantes (partage, duplication, import, reset password, etc.). Vérifier les fonctionnalités réellement accessibles avant de les annoncer.
- `parseFloat(temperature) || 0.7` remplace la température valide 0 par 0.7 ; même problème pour certains paramètres de templates.
- Pagination de l’historique : résultat COUNT(*) abandonné et total lu depuis le tableau de messages.
- Version package.json 1.0.0, nom du dossier v1.1 : version officielle à harmoniser.
- Le build produit un bundle JS d’environ 2,4 Mo. Des artefacts compilés sont présents sous src/dist et certains dist sont déjà suivis malgré .gitignore.

## Vérification

- 4 tests Node réussis : UTF-8 à toutes les frontières réseau, réception octet par octet, statistiques/template et dossier étrangers avec doubles de base SQL. Ces tests ne remplacent pas une validation avec deux comptes sur une instance complète.
- Build Vite réussi ; avertissement de taille du bundle.
- Lint ciblé hors dist : 59 erreurs et 5 avertissements avant livraison des derniers tests ; configuration navigateur appliquée aussi au backend et tests Node, variables inutilisées et règles React existantes. Le lint global échoue aussi sur les artefacts src/dist. Pas de validation lint verte revendiquée.
- Audit dépendances incomplet : npm audit exige un package-lock absent ; yarn audit échoue sur la résolution DNS registry.yarnpkg.com. Aucun nombre de CVE confirmé. Ne pas présenter les dépendances comme exemptes de vulnérabilités.
- Pas de validation visuelle du site déployé ni de contrôle des données déjà stockées. Le correctif du flux doit être déployé pour bénéficier aux nouveaux messages.

- SQL DocManager exécuté trois fois sur une instance MySQL 8.0.44 temporaire, avec tables de test compatibles : une seule fiche, JSON valides, contenu UTF-8 et champs chiffrés préservés. Schéma réel de DocManager non interrogé. Instance de test arrêtée.

## Vérification complémentaire de l’API DeepSeek et de la capture

Documentation officielle consultée le 2026-10-01 : https://api-docs.deepseek.com/api/create-chat-completion/

- Le contrat Chat Completions transmet des fragments dans choices[0].delta.content. Les espaces contenus dans ces fragments doivent être conservés et les fragments concaténés dans l’ordre. reasoning_content est séparé du texte final.
- Le flux termine avec data: [DONE]. finish_reason=length indique une réponse écourtée par le budget de tokens/contexte ; il ne démontre pas une perte de préfixe au milieu d’un mot.
- stream_options.include_usage est désormais demandé explicitement. Le traitement ne suppose pas que toutes les réponses comportent du contenu : événements vides et statistiques seules sont acceptés.
- Le backend vérifie désormais le marqueur de fin, refuse de confirmer une réponse dont le JSON est invalide ou la connexion interrompue, capture les erreurs de finalisation et renvoie le texte complet dans l’événement done.
- Le navigateur traite aussi la dernière ligne sans saut final, conserve les espaces et accents, ne confond pas le marqueur DeepSeek brut avec la confirmation interne contenant les identifiants enregistrés, et signale les flux tronqués plutôt que de les ignorer.
- L’interface conserve les réponses partielles en cas d’erreur et affiche un indicateur d’interruption. À confirmation, elle reprend le texte complet du backend. Un avertissement explicite est affiché pour finish_reason=length. Une réponse partielle conservée dans l’écran n’est pas automatiquement enregistrée dans MySQL et peut disparaître après rechargement.
- 9 tests Node réussis, dont un parcours simulé du véritable handler Express jusqu’au lecteur navigateur, avec doubles de l’API DeepSeek et de MySQL, flux reçu octet par octet, statistiques et raisonnement séparé. Le cas « Contin » + « uez à parler » reste intégralement visible ; ce test ne prouve pas le contenu original du message de la capture.
- Aucun appel facturé au fournisseur ni requête sur les données de production. La capture seule ne permet pas de distinguer ancien message enregistré incomplet, ancien backend encore déployé, réponse du fournisseur déjà incomplète ou problème d’affichage. Les correctifs restent locaux : reconstruire le frontend et redémarrer le backend lors du déploiement. Les messages historiques ne sont pas réparés automatiquement.

## Vérification sur le VPS avant déploiement

Deux appels réels à DeepSeek (JSON et streaming) ont recopié intégralement les 217 caractères du texte de test, finish_reason=stop. Résultats dans docs/diagnostics/provider-results.json. Backend public avant mise à jour : 1.0.0, actif depuis environ douze jours ; frontend local configuré vers cette API distante avant séparation. PM2 chat-backend exécute /var/www/chat/backend/server.js ; Apache sert /var/www/chat/frontend/dist et proxy /api vers 5001. FRONTEND_URL de production portait un :3000 erroné, corrigé lors de la migration vers backend/.env.production. Version livrée : 1.1.0.
</pre>',
'backend',
'active',
'high',
'["chat", "deepseek", "securite", "utf8", "sse"]',
'chat_app_v1.0',
'https://chat.amarsyll.pro',
'https://github.com/Amar1921/chat_app_v1.1.git',
'["React", "Vite", "Material UI", "Node.js", "Express", "MySQL", "JWT", "DeepSeek"]',
'[{"key": "VITE_API_URL", "value": "http://localhost:5002/api", "sensitive": false, "note": ".env.development ; variables du service prioritaires côté backend."}, {"key": "VITE_API_URL", "value": "/api", "sensitive": false, "note": ".env.production ; variables du service prioritaires côté backend."}, {"key": "PORT", "value": "5002", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "NODE_ENV", "value": "development", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DB_HOST", "value": "127.0.0.1", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DB_PORT", "value": "3307", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DB_USER", "value": "syll_amar", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DB_PASSWORD", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DB_NAME", "value": "chat_ia", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "JWT_SECRET", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "JWT_EXPIRES_IN", "value": "7d", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DEEPSEEK_API_KEY", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "DEEPSEEK_API_URL", "value": "https://api.deepseek.com/v1", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "FRONTEND_URL", "value": "http://localhost:5173", "sensitive": false, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "JWT_REFRESH_SECRET", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.development ; variables du service prioritaires côté backend."}, {"key": "NODE_ENV", "value": "production", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "PORT", "value": "5001", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DB_HOST", "value": "127.0.0.1", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DB_PORT", "value": "3306", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DB_USER", "value": "chat_ia", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DB_PASSWORD", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DB_NAME", "value": "chat_ia", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "JWT_SECRET", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "JWT_REFRESH_SECRET", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "JWT_EXPIRES_IN", "value": "7d", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DEEPSEEK_API_KEY", "value": "[MASQUÉ]", "sensitive": true, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "DEEPSEEK_API_URL", "value": "https://api.deepseek.com/v1", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}, {"key": "FRONTEND_URL", "value": "https://chat.amarsyll.pro", "sensitive": false, "note": "backend/.env.production ; variables du service prioritaires côté backend."}]',
'[{"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/src", "label": "Frontend React"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/backend", "label": "API Express"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/backend/schema.sql", "label": "Schéma MySQL"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/backend/bd.sql", "label": "Schéma alternatif à comparer"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/backend/.env.development", "label": "Backend développement privé"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/backend/.env.production", "label": "Backend production privé"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/.env.development", "label": "Frontend développement public"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/.env.production", "label": "Frontend production public"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/docs/environnements.md", "label": "Guide des environnements"}, {"path": "/Users/amarsyll/WebstormProjects/chat_app_v1.1/docs/audit-2026-10-01.md", "label": "Audit sécurité et encodage"}]',
'[{"label": "dev", "command": "npm run dev", "context": "Racine du projet"}, {"label": "build", "command": "npm run build", "context": "Racine du projet"}, {"label": "lint", "command": "npm run lint", "context": "Racine du projet"}, {"label": "preview", "command": "npm run preview", "context": "Racine du projet"}, {"label": "start:server", "command": "npm run start:server", "context": "Racine du projet"}, {"label": "dev:server", "command": "npm run dev:server", "context": "Racine du projet"}, {"label": "build:dev", "command": "npm run build:dev", "context": "Racine du projet"}, {"label": "Tests ciblés", "command": "node --test tests/*.test.js", "context": "Local"}, {"label": "Générer documentation", "command": "python3 docs/generate-docmanager-sql.py", "context": "Local"}]',
'[{"host": "127.0.0.1", "port": 3307, "service": "MySQL local configuré"}, {"host": "localhost", "port": 5002, "service": "Express développement"}, {"host": "localhost", "port": 5173, "service": "Vite développement ; port fixe"}]',
'[{"label": "MySQL", "user": "syll_amar", "note": "Mot de passe dans backend/.env.development ou backend/.env.production, jamais exporté."}, {"label": "Compte application", "user": "Non inspecté", "note": "Comptes et rôles dans users ; aucune donnée utilisateur consultée."}]',
'[{"step": 1, "label": "Préparer configuration", "command": "cp backend/.env.production.example backend/.env.production ; renseigner les secrets et les paramètres du serveur"}, {"step": 2, "label": "Installer selon verrou Yarn", "command": "yarn install --frozen-lockfile"}, {"step": 3, "label": "Base neuve uniquement", "command": "mysql -u UTILISATEUR -p < backend/schema.sql"}, {"step": 4, "label": "Tests et compilation", "command": "node --test tests/*.test.js && npm run build"}, {"step": 5, "label": "API", "command": "npm run start:server"}, {"step": 6, "label": "Production", "command": "Servir dist via HTTPS et proxy /api vers Express ; service système et configurations à fournir."}]',
'[{"title": "Flux UTF-8 fragmenté ou interrompu", "description": "Lignes et caractères découpés par le réseau perdaient des fragments.", "solution": "Décodeur incrémental, contrôle de fin DeepSeek, texte final confirmé et réponses partielles conservées dans l’écran ; 9 tests passent."}, {"title": "Lectures entre utilisateurs", "description": "Statistiques, template et dossier sans filtre du propriétaire.", "solution": "Contrôles corrigés ; tests avec doubles SQL."}, {"title": "Sessions non révoquées", "description": "Renouvellement sans comparaison du token stocké.", "solution": "À faire : rotation, hash du renouvellement, migration et révocation."}, {"title": "Audit dépendances indisponible", "description": "DNS registry.yarnpkg.com indisponible ; pas de package-lock.", "solution": "Relancer yarn audit avec un accès réseau fonctionnel."}, {"title": "Lint existant en échec", "description": "Artefacts src/dist et configuration Node manquante, erreurs React et variables inutilisées.", "solution": "Exclure les artefacts et distinguer environnements Node/navigateur puis corriger les erreurs."}]',
'1.1.0',
'Environnements séparés : frontend à la racine, backend dans backend/.env.<mode>. npm run dev:server charge development ; npm run start:server charge production. Ancien .env sauvegardé dans .env.legacy, non chargé. Configuration production privée à compléter. Audit local du 2026-10-01. Version lue dans package.json. Apache et PM2 vérifiés ; cron et logrotate non vérifiés. Déploiement via release avec sauvegarde et rollback. Les champs chiffrés DocManager sont préservés en mise à jour.',
0,
0,
(SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1), NOW()) AS new
ON DUPLICATE KEY UPDATE
`title` = new.`title`,
`summary` = new.`summary`,
`content` = new.`content`,
`category` = new.`category`,
`status` = new.`status`,
`priority` = new.`priority`,
`tags` = new.`tags`,
`project_name` = new.`project_name`,
`project_url` = new.`project_url`,
`repo_url` = new.`repo_url`,
`tech_stack` = new.`tech_stack`,
`file_paths` = new.`file_paths`,
`commands` = new.`commands`,
`ports` = new.`ports`,
`deploy_steps` = new.`deploy_steps`,
`known_issues` = new.`known_issues`,
`version` = new.`version`,
`notes` = new.`notes`,
`is_public` = new.`is_public`,
`is_pinned` = new.`is_pinned`,
`updated_at` = NOW();
SELECT slug, version FROM documentation WHERE slug = 'configuration-chat-app-v1-1';
