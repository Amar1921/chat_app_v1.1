#!/usr/bin/env python3
"""Adaptation du générateur veille_ia : configuration réelle, secrets masqués."""
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
package = json.loads((ROOT / 'package.json').read_text())
safe_keys = {'PORT', 'NODE_ENV', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_EXPIRES_IN', 'DEEPSEEK_API_URL', 'FRONTEND_URL', 'VITE_API_URL'}
profiles = {}
variables = []
for filename in ('.env.development', '.env.production', 'backend/.env.development', 'backend/.env.production'):
    values = {}
    source = ROOT / filename
    if not source.exists():
        source = ROOT / (filename + '.example')
    for line in source.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    profiles[filename] = values
    variables.extend({'key': key, 'value': value if key in safe_keys else '[MASQUÉ]', 'sensitive': key not in safe_keys, 'note': filename + ' ; variables du service prioritaires côté backend.'} for key, value in values.items())
env = profiles['backend/.env.development']
production_env = profiles['backend/.env.production']
commands = [{'label': key, 'command': 'npm run ' + key, 'context': 'Racine du projet'} for key in package['scripts']]
commands += [{'label': 'Tests ciblés', 'command': 'node --test tests/*.test.js', 'context': 'Local'}, {'label': 'Générer documentation', 'command': 'python3 docs/generate-docmanager-sql.py', 'context': 'Local'}]
paths = [{'path': str(ROOT / name), 'label': label} for name, label in [('src', 'Frontend React'), ('backend', 'API Express'), ('backend/schema.sql', 'Schéma MySQL'), ('backend/bd.sql', 'Schéma alternatif à comparer'), ('backend/.env.development', 'Backend développement privé'), ('backend/.env.production', 'Backend production privé'), ('.env.development', 'Frontend développement public'), ('.env.production', 'Frontend production public'), ('docs/environnements.md', 'Guide des environnements'), ('docs/audit-2026-10-01.md', 'Audit sécurité et encodage')]]
issues = [
    {'title': 'Flux UTF-8 fragmenté ou interrompu', 'description': 'Lignes et caractères découpés par le réseau perdaient des fragments.', 'solution': 'Décodeur incrémental, contrôle de fin DeepSeek, texte final confirmé et réponses partielles conservées dans l’écran ; 9 tests passent.'},
    {'title': 'Lectures entre utilisateurs', 'description': 'Statistiques, template et dossier sans filtre du propriétaire.', 'solution': 'Contrôles corrigés ; tests avec doubles SQL.'},
    {'title': 'Sessions non révoquées', 'description': 'Renouvellement sans comparaison du token stocké.', 'solution': 'À faire : rotation, hash du renouvellement, migration et révocation.'},
    {'title': 'Audit dépendances indisponible', 'description': 'DNS registry.yarnpkg.com indisponible ; pas de package-lock.', 'solution': 'Relancer yarn audit avec un accès réseau fonctionnel.'},
    {'title': 'Lint existant en échec', 'description': 'Artefacts src/dist et configuration Node manquante, erreurs React et variables inutilisées.', 'solution': 'Exclure les artefacts et distinguer environnements Node/navigateur puis corriger les erreurs.'},
]
deploy = [{'step': 1, 'label': 'Préparer configuration', 'command': 'cp backend/.env.production.example backend/.env.production ; renseigner les secrets et les paramètres du serveur'}, {'step': 2, 'label': 'Installer selon verrou Yarn', 'command': 'yarn install --frozen-lockfile'}, {'step': 3, 'label': 'Base neuve uniquement', 'command': 'mysql -u UTILISATEUR -p < backend/schema.sql'}, {'step': 4, 'label': 'Tests et compilation', 'command': 'node --test tests/*.test.js && npm run build'}, {'step': 5, 'label': 'API', 'command': 'npm run start:server'}, {'step': 6, 'label': 'Production', 'command': 'Servir dist via HTTPS et proxy /api vers Express ; service système et configurations à fournir.'}]
audit = (ROOT / 'docs/audit-2026-10-01.md').read_text()
content = '<h2>Architecture</h2><p>React/Vite/Material UI → Express/JWT → MySQL utf8mb4 ; Express appelle DeepSeek par HTTPS et renvoie un flux SSE.</p>'
content += '<h2>Configuration serveur</h2><p>VirtualHost Apache : vérifié sur le VPS, référence dans deploy/apache-vhost.reference.conf. Racine /var/www/chat/frontend/dist ; proxy /api vers 127.0.0.1:5001. Backend PM2 chat-backend dans /var/www/chat/backend. Pool PHP-FPM : non applicable à cette application Node.js. Crontab et logrotate : aucun fichier fourni, état du serveur inconnu.</p>'
content += '<h2>Environnement sans secrets</h2><pre>' + html.escape('\n'.join(v['note'].split(' ;')[0] + ' : ' + v['key'] + '=' + v['value'] for v in variables)) + '</pre>'
for name in ['package.json', 'vite.config.js', 'backend/models/db.js', 'deploy/apache-vhost.reference.conf', 'deploy/activate.sh']:
    content += '<h3>' + name + '</h3><pre>' + html.escape((ROOT / name).read_text()) + '</pre>'
content += '<h2>Environnements</h2><pre>' + html.escape((ROOT / 'docs/environnements.md').read_text()) + '</pre>'
content += '<h2>Audit et validation</h2><pre>' + html.escape(audit) + '</pre>'
repo = subprocess.run(['git', 'config', '--get', 'remote.origin.url'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
# Ne jamais exporter un remote qui contient des identifiants intégrés.
if '@' in repo and not repo.startswith('git@'):
    repo = ''
record = {
    'title': 'Chat IA — architecture et audit', 'slug': 'configuration-chat-app-v1-1',
    'summary': 'Chat DeepSeek React/Express/MySQL ; correction du flux UTF-8 et de trois lectures entre utilisateurs. Renouvellement JWT et validation des entrées à sécuriser.',
    'content': content, 'category': 'backend', 'status': 'active', 'priority': 'high',
    'tags': ['chat', 'deepseek', 'securite', 'utf8', 'sse'], 'project_name': package['name'],
    'project_url': production_env.get('FRONTEND_URL', ''), 'repo_url': repo,
    'tech_stack': ['React', 'Vite', 'Material UI', 'Node.js', 'Express', 'MySQL', 'JWT', 'DeepSeek'],
    'env_variables': variables, 'file_paths': paths, 'commands': commands,
    'ports': [{'host': env.get('DB_HOST', 'localhost'), 'port': int(env.get('DB_PORT', 3306)), 'service': 'MySQL local configuré'}, {'host': 'localhost', 'port': int(env.get('PORT', 5001)), 'service': 'Express développement'}, {'host': 'localhost', 'port': 5173, 'service': 'Vite développement ; port fixe'}],
    'credentials': [{'label': 'MySQL', 'user': env.get('DB_USER', ''), 'note': 'Mot de passe dans backend/.env.development ou backend/.env.production, jamais exporté.'}, {'label': 'Compte application', 'user': 'Non inspecté', 'note': 'Comptes et rôles dans users ; aucune donnée utilisateur consultée.'}],
    'deploy_steps': deploy, 'known_issues': issues, 'version': package['version'],
    'notes': 'Environnements séparés : frontend à la racine, backend dans backend/.env.<mode>. npm run dev:server charge development ; npm run start:server charge production. Ancien .env sauvegardé dans .env.legacy, non chargé. Configuration production privée à compléter. Audit local du 2026-10-01. Version lue dans package.json. Apache et PM2 vérifiés ; cron et logrotate non vérifiés. Déploiement via release avec sauvegarde et rollback. Les champs chiffrés DocManager sont préservés en mise à jour.',
    'is_public': 0, 'is_pinned': 0,
}

def sql(value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace('\\', '\\\\').replace("'", "''") + "'"

columns = list(record)
updates = [key for key in columns if key not in ('slug', 'env_variables', 'credentials')]
statement = '-- MySQL 8.0.19+ ; importer dans docmanager. Aucun secret.\nSET NAMES utf8mb4;\n'
statement += 'INSERT INTO `documentation` (' + ', '.join('`' + key + '`' for key in columns) + ', `created_by`, `created_at`)\nVALUES (\n'
statement += ',\n'.join(sql(record[key]) for key in columns)
statement += ",\n(SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1), NOW()) AS new\nON DUPLICATE KEY UPDATE\n"
statement += ',\n'.join('`' + key + '` = new.`' + key + '`' for key in updates) + ',\n`updated_at` = NOW();\n'
statement += "SELECT slug, version FROM documentation WHERE slug = 'configuration-chat-app-v1-1';\n"
output = ROOT / 'docs/docmanager-chat-app.sql'
output.write_text(statement)
print(output)
