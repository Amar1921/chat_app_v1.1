# Configuration développement et production

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

- Le backend choisit explicitement development ou production, puis charge uniquement `backend/.env.<mode>`. Il ne lit ni le `.env` racine ni `.env.legacy`. La résolution est indépendante du répertoire de lancement. Un fichier manquant ou une variable indispensable vide bloque le démarrage avec un message qui indique le fichier ou la variable.
- Les variables déjà définies par le terminal, systemd ou l’hébergeur priment sur les valeurs du fichier backend. Le script de lancement fixe NODE_ENV selon sa commande, avant de charger les routes et le pool MySQL.
- Vite utilise ses priorités natives : variables du terminal, `.env.<mode>.local`, `.env.<mode>`, `.env.local`, `.env`. Le `.env` racine contient désormais seulement des commentaires. Aucun `.env.local` n’est fourni. Un VITE_API_URL distant en développement provoque une erreur explicite.
- Les fichiers frontend `.env.development` et `.env.production` ne contiennent que des paramètres publics et sont versionnés. Les deux fichiers backend réels et `.env.legacy` sont ignorés par Git et protégés avec des permissions 600. Les exemples backend, sans secret, sont versionnés.
- Ne jamais placer la clé DeepSeek, les secrets JWT ou les mots de passe MySQL dans une variable VITE_* : ces variables sont accessibles au navigateur.
- `.env.legacy` sauvegarde l’ancienne configuration avant la séparation ; il n’est chargé par aucune commande fournie.

Référence officielle : https://vite.dev/guide/env-and-mode
