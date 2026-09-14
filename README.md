# Planit — Tâches, Calendrier & Rappels Intelligents

Planit est une application web moderne de productivité et de gestion de tâches collaborative, conçue pour organiser les journées, suivre les échéances et synchroniser les équipes en temps réel avec un haut niveau de sécurité (chiffrement et authentification renforcée).

---

## 🚀 Fonctionnalités Clés

- **Gestion des Tâches Avancée** : Création, édition, catégorisation, priorisation (Basse, Moyenne, Haute, Urgente), statuts (À faire, En cours, Terminée) et étiquettes personnalisées.
- **Vues Multiples** :
  - **Vue Liste** : Vue claire avec filtres par statut, priorité et recherche textuelle.
  - **Vue Calendrier** : Planification interactive des tâches et des rappels par jour, semaine ou mois.
  - **Vue Tableau (Kanban)** : Organisation par colonnes de statut glissantes.
- **Sécurité & Authentification (Better Auth)** :
  - Authentification sécurisée par email et mot de passe.
  - Gestion des rôles et des équipes (RBAC).
  - Sessions chiffrées compatibles avec les environnements conteneurisés et iframes.
- **Rappels & Notifications** : Alertes et gestion des échéances avec compteurs de rappels actifs.
- **Mode Hors-Ligne & Persistance Cloud** : Stockage persistant via PostgreSQL / Drizzle ORM avec résilience hors-ligne.

---

## 🛠️ Stack Technique

- **Framework** : Next.js 15 (App Router, Server Actions, API Routes)
- **Langage** : TypeScript
- **Style** : Tailwind CSS v4, Lucide React (Icônes)
- **Authentification** : Better Auth
- **Base de Données & ORM** : PostgreSQL / SQLite (via Drizzle ORM)
- **Animations** : Motion (Framer Motion)

---

## ⚙️ Installation & Développement Local

1. Cloner le projet et installer les dépendances :
   ```bash
   npm install
   ```
2. Configurer les variables d'environnement dans `.env` (basé sur `.env.example`) :
   ```env
   BETTER_AUTH_SECRET=votre_secret_securise
   DATABASE_URL=postgres://...
   APP_URL=http://localhost:3000
   ```
3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
4. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.
