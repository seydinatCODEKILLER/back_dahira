# 💰 Gestion des Cotisations — API

Application de gestion des cotisations journalières d'une association (tontine, caisse solidaire, etc.). Elle permet aux membres de déclarer leurs versements, à l'administrateur/trésorier de les valider, et suit automatiquement les retards, les avances et le solde de chaque membre.

## ✨ Fonctionnalités principales

- **Authentification** par PIN à 4 chiffres + JWT (access + refresh token)
- **Gestion des membres** (actif / inactif / bloqué)
- **Déclaration de versements** par les membres (cotisation simple ou avance de plusieurs jours)
- **Validation / rejet** des versements par l'administrateur
- **Saisie directe par l'administrateur** pour les membres injoignables ou ne pouvant pas utiliser l'application (paiement en espèces, absence de connexion, etc.)
- **Génération automatique des cotisations quotidiennes**, avec prise en compte des avances déjà validées
- **Détection automatique des retards** et blocage du membre en cas de retard critique
- **Calcul du solde** (à jour / en avance / en retard / bloqué) avec débocage automatique dès régularisation
- **Alertes** d'échéance et de retard
- **Traçabilité complète** de toutes les actions financières via un journal d'audit
- **Tâches planifiées (cron)** pour automatiser génération, détection de retard, alertes et recalcul de sécurité

## 🛠️ Stack technique

| Composant | Technologie |
|---|---|
| Runtime | Node.js |
| Framework HTTP | Express |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentification | JWT (access + refresh token) |
| Tâches planifiées | node-cron |
| Documentation API | Swagger / OpenAPI |

## 📁 Architecture du projet

Le projet suit une architecture modulaire par domaine métier. Chaque module regroupe : `controller`, `service`, `repository`, `routes`, `schema` (validation Zod).

```
src/
├── config/                 # Configuration (DB, logger, rate limiter, scheduler)
├── shared/
│   ├── base/                # BaseRepository générique
│   ├── errors/               # Classes d'erreurs (AppError, NotFoundError, ...)
│   └── middlewares/           # Auth, validation, gestion d'erreurs
├── jobs/
│   └── scheduler.js          # Initialisation des cron jobs
└── modules/
    ├── membres/
    ├── versements/
    ├── cotisations/
    ├── soldes/
    ├── alertes/
    ├── configuration/
    └── audit/
```

## 🗄️ Modèle de données (résumé)

| Modèle | Rôle |
|---|---|
| `Membre` | Un adhérent (ou l'administrateur) |
| `Configuration` | Paramètres métier configurables (montant journalier, seuils, délais) |
| `Versement` | Un paiement effectué (couvre un ou plusieurs jours) |
| `Cotisation` | Une ligne par jour dû pour un membre, alimente le calendrier |
| `Solde` | Cache du solde d'un membre, recalculé à chaque événement |
| `Alerte` | Notification d'échéance ou de retard |
| `AuditLog` | Traçabilité de toute action financière/administrative |
| `RefreshToken` | Jetons de rafraîchissement pour l'authentification JWT |

Voir `prisma/schema.prisma` pour le détail complet des champs et relations.

## 🚀 Installation

### Prérequis

- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ou yarn

### Étapes

```bash
# 1. Cloner le projet
git clone <url-du-repo>
cd <nom-du-projet>

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# puis éditer .env avec vos propres valeurs

# 4. Générer le client Prisma
npx prisma generate

# 5. Appliquer les migrations
npx prisma migrate dev

# 6. Initialiser les données de base (configuration, admin, etc.)
npx prisma db seed

# 7. Lancer le serveur en développement
npm run dev
```

## ⚙️ Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL (via le pooler) |
| `DIRECT_URL` | URL de connexion directe PostgreSQL (pour les migrations) |
| `JWT_ACCESS_SECRET` | Secret pour signer les access tokens |
| `JWT_REFRESH_SECRET` | Secret pour signer les refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Durée de validité de l'access token |
| `JWT_REFRESH_EXPIRES_IN` | Durée de validité du refresh token |
| `PORT` | Port d'écoute du serveur |
| `NODE_ENV` | `development` / `production` |

> Adapter cette liste au fichier `.env.example` réel du projet.

## 📜 Scripts disponibles

```bash
npm run dev            # Démarre le serveur en mode développement (watch)
npm start               # Démarre le serveur en mode production
npm run prisma:studio   # Ouvre Prisma Studio pour explorer la base
npm run prisma:migrate  # Applique les migrations
npm run prisma:seed     # Relance le seed
```

> Adapter les noms de scripts au `package.json` réel du projet.

## 🔑 Rôles et permissions

| Rôle | Peut faire |
|---|---|
| `MEMBRE` | Consulter son profil, déclarer un versement, consulter ses cotisations/solde/alertes |
| `ADMIN` | Tout ce que peut faire un membre, + valider/rejeter des versements, saisir un versement au nom d'un membre, gérer les membres, déclencher les tâches manuelles, consulter les vues globales |

## 🔄 Cycle de vie d'une cotisation

```
1. Génération quotidienne (cron 00:05)
        │
        ▼
   Cotisation EN_ATTENTE  ──┐
        │                    │ (si avance déjà validée pour cette date)
        │                    ▼
        │              Cotisation PAYE directement
        │
        ▼
2. Paiement hors application (Mobile Money, espèces, virement...)
        │
        ├── Le membre déclare son versement dans l'app
        │        │
        │        ▼
        │   Versement EN_ATTENTE
        │        │
        │        ├── Admin valide  → Cotisation(s) → PAYE, Solde recalculé
        │        └── Admin rejette → Cotisation(s) inchangées
        │
        └── Le membre est injoignable / ne peut pas utiliser l'app
                 │
                 ▼
        Admin saisit directement le versement en son nom
                 │
                 ▼
        Versement VALIDE créé directement → Cotisation(s) → PAYE

3. Retard non régularisé (cron 01:00)
        │
        ▼
   Cotisation RETARD → Membre potentiellement BLOQUE

4. Alertes (cron 08:00 / 08:05)
        │
        ▼
   Notification d'échéance ou de retard au(x) destinataire(s)

5. Recalcul de sécurité (cron dimanche 03:00)
        │
        ▼
   Vérifie et corrige tout décalage de solde
```

## 📡 Aperçu des endpoints principaux

### Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion par matricule + PIN |
| POST | `/api/auth/refresh` | Rafraîchir l'access token |
| POST | `/api/auth/logout` | Déconnexion |

### Versements
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/versements` | Membre | Déclarer un versement |
| GET | `/api/versements/me` | Membre | Mes versements |
| GET | `/api/versements` | Admin | Liste de tous les versements |
| GET | `/api/versements/:id` | Membre (le sien) / Admin | Détail d'un versement |
| PATCH | `/api/versements/:id/valider` | Admin | Valider un versement |
| PATCH | `/api/versements/:id/rejeter` | Admin | Rejeter un versement |
| POST | `/api/versements/admin` | Admin | Déclarer **et** valider un versement au nom d'un membre injoignable |

### Cotisations
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/cotisations/me` | Membre | Mon calendrier de cotisations |
| GET | `/api/cotisations/me/resume` | Membre | Mon résumé chiffré |
| GET | `/api/cotisations/membre/:membreId` | Admin | Calendrier d'un membre |
| GET | `/api/cotisations/membre/:membreId/resume` | Admin | Résumé chiffré d'un membre |
| GET | `/api/cotisations` | Admin | Vue d'ensemble de toutes les cotisations |
| POST | `/api/cotisations/generer-jour` | Admin | Générer manuellement les cotisations du jour |
| POST | `/api/cotisations/marquer-retards` | Admin | Détecter manuellement les retards |

### Soldes
| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/soldes/me` | Membre | Mon solde |
| GET | `/api/soldes` | Admin | Vue d'ensemble des soldes |
| GET | `/api/soldes/membre/:membreId` | Admin | Solde d'un membre |
| POST | `/api/soldes/membre/:membreId/recalculer` | Admin | Recalculer le solde d'un membre |
| POST | `/api/soldes/recalculer-tout` | Admin | Recalculer tous les soldes |

📖 La documentation interactive complète (Swagger) est disponible à l'adresse `/api-docs` une fois le serveur lancé.

## ⏰ Tâches planifiées (cron)

| Heure | Tâche | Rôle |
|---|---|---|
| 00:05 chaque jour | Génération des cotisations du jour | Crée les lignes `Cotisation` pour chaque membre actif |
| 01:00 chaque jour | Détection des retards critiques | Passe les cotisations en retard, recalcule les soldes concernés |
| 08:00 chaque jour | Alertes d'échéance | Prévient les membres avant l'échéance |
| 08:05 chaque jour | Alertes de retard | Prévient en cas de retard constaté |
| 03:00 chaque dimanche | Recalcul global de sécurité | Corrige tout décalage de solde persistant |

## 🧪 Tests

```bash
npm test
```

> Adapter cette section au framework de test réellement utilisé (Jest, Vitest, etc.).

## 📄 Licence

À compléter selon le choix du projet (MIT, propriétaire, etc.).