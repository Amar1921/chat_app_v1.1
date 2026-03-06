# 🤖 DeepSeek Chat — Application IA Full-Stack

Une application de chat IA moderne et complète utilisant l'API DeepSeek, avec React + Material UI (thème sombre premium), backend Node.js/Express et base de données MySQL.

---

## ✨ Fonctionnalités

### 💬 Chat IA
- **Streaming en temps réel** — Les réponses apparaissent mot par mot
- **Multi-modèles** — DeepSeek Chat & DeepSeek Reasoner (R1)
- **Raisonnement affiché** — Voir la "pensée interne" du modèle R1 (collapsible)
- **Rendu Markdown** — Code avec coloration syntaxique, tableaux, listes, etc.
- **Copie de code** — Bouton copier sur chaque bloc de code

### 📁 Gestion des conversations
- **Historique complet** — Toutes les conversations avec contexte préservé
- **Titre automatique** — L'IA génère un titre depuis votre premier message
- **Épingler** — Gardez vos conversations importantes en haut
- **Archiver** — Rangez sans supprimer
- **Dupliquer** — Clonez une conversation avec ses paramètres
- **Partager** — Lien public généré (share token)
- **Recherche** — Cherchez dans vos conversations
- **Menu contextuel** — Clic droit sur une conversation

### ⚙️ Paramètres avancés par conversation
- **Sélection du modèle** — Changeable par conversation
- **Max Tokens** — De 256 à 8192
- **Température** — Contrôle la créativité (0 à 2)
- **Top P, Presence Penalty, Frequency Penalty**
- **Prompt Système** — Personnalisez l'assistant

### 🔖 Favoris & Réactions
- **Bookmarks** — Sauvegardez les meilleurs messages
- **Réactions** 👍/👎 — Notez les réponses
- **Page Favoris** — Retrouvez tous vos messages sauvegardés

### 📊 Analytics Dashboard
- Statistiques complètes : conversations, messages, tokens
- Graphiques : messages/jour, tokens/jour (7 derniers jours)
- Répartition des modèles (pie chart)
- Temps de réponse moyen
- Activité récente

### 🎨 Design & UX
- **Thème sombre premium** — Violet/Cyan sur fond noir profond
- **Animations** — Framer Motion sur tous les éléments
- **Responsive** — Mobile avec sidebar drawer
- **Raccourci clavier** — `Ctrl+K` pour nouvelle conversation
- **Templates de prompts** — Bibliothèque de prompts prédéfinis

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- MySQL 8+
- Clé API DeepSeek ([deepseek.com](https://platform.deepseek.com))

### 1. Base de données MySQL

```sql
-- Connectez-vous à MySQL et exécutez:
mysql -u root -p < backend/schema.sql
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env .env
# Éditez .env avec vos valeurs :
#   DB_PASSWORD=votre_mot_de_passe_mysql
#   DEEPSEEK_API_KEY=sk-votre_clé_deepseek
#   JWT_SECRET=une_clé_aléatoire_longue

# Démarrer le serveur
npm run dev   # développement
npm start     # production
```

Le serveur démarre sur `http://localhost:5001`

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer en développement
npm start
```

L'app s'ouvre sur `http://localhost:3000`

---

## 🏗️ Architecture

```
deepseek-chat/
├── backend/
│   ├── models/
│   │   └── db.js              # Pool MySQL avec helpers
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Login, Register, Profil
│   │   ├── conversations.js   # CRUD conversations
│   │   ├── chat.js            # Streaming DeepSeek API
│   │   └── stats.js           # Analytics, Prompts, Folders
│   ├── server.js              # Express app principal
│   ├── schema.sql             # Schéma base de données
│   └── .env.example           # Variables d'environnement
│

     src/
    ├── theme/             # Thème MUI dark/light
    ├── contexts/          # AuthContext (React)
    ├── utils/             # API service (axios)
    ├── components/
    │   ├── Sidebar.jsx    # Navigation + liste convos
    │   ├── Message.jsx    # Rendu markdown + actions
    │   └── SettingsPanel.jsx  # Panneau paramètres
    └── pages/
        ├── AuthPage.jsx       # Login / Register
        ├── ChatPage.jsx       # Interface de chat
        ├── AnalyticsPage.jsx  # Dashboard stats
        └── UtilityPages.jsx   # Settings & Bookmarks
```

---

## 🔑 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Profil actuel |
| PUT | `/api/auth/preferences` | Mettre à jour préférences |
| PUT | `/api/auth/password` | Changer mot de passe |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | Liste (avec filtres) |
| POST | `/api/conversations` | Créer |
| GET | `/api/conversations/:id` | Détail + messages |
| PUT | `/api/conversations/:id` | Modifier |
| DELETE | `/api/conversations/:id` | Supprimer |
| POST | `/api/conversations/:id/share` | Toggle partage |
| POST | `/api/conversations/:id/duplicate` | Dupliquer |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/:convId` | Envoyer message (streaming SSE) |
| PUT | `/api/chat/messages/:id/bookmark` | Toggle favori |
| PUT | `/api/chat/messages/:id/reaction` | Réaction like/dislike |
| GET | `/api/chat/bookmarks/all` | Tous les favoris |

---

## 🔒 Sécurité
- Authentification JWT avec expiration 7 jours
- Mots de passe hashés avec bcrypt (12 rounds)
- Rate limiting: 30 req/min sur l'API chat
- Headers sécurisés via Helmet
- CORS configuré uniquement pour le frontend

---

## 📦 Variables d'environnement

```env
# Server
PORT=5001

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mdp
DB_NAME=deepseek_chat

# JWT
JWT_SECRET=clé_secrète_très_longue
JWT_EXPIRES_IN=7d

# DeepSeek API
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# CORS
FRONTEND_URL=http://localhost:3000
```
![Firefox_Screenshot_2026-03-06T19-40-17 892Z](https://github.com/user-attachments/assets/76283e44-c276-4e0d-91c4-30aa954ff5bc)
![Capture d’écran 2026-03-06 à 20 41 14](https://github.com/user-attachments/assets/18ca8893-304d-4977-b8d4-4af5d6c3b3c3)
![Capture d’écran 2026-03-06 à 20 39 24](https://github.com/user-attachments/assets/c7906b57-c313-42db-bf5f-d2ace72da1ad)


