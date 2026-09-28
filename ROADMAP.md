# ROADMAP — Planit

---
> **En-tête de Suivi**
> - **Dernière modification** : 10:55
> - **Date** : 2026-09-17
> - **Auteur** : Agent (Google AI Studio AI Coding Agent)
> - **Version actuelle** : v1.3 (Stable & Optimisée Mobile)
---

Ce document répertorie l'état d'avancement du projet ainsi que la liste exhaustive des fonctionnalités actuellement disponibles et planifiées.

## ✅ Fonctionnalités Disponibles (v1.3 - Actuelles)

### 1. Identité Visuelle & Ergonomie (Dark Glassmorphism)
- [x] **Thème Sombre Émeraude Premium** : Palette visuelle unifiée (`#04120C`, `#061A13`, `#082219`, `emerald-500`), contrastes élevés et élimination intégrale des artefacts clairs résiduels.
- [x] **Accessibilité & Typographie** : Typographie blanche et émeraude haute lisibilité conforme aux critères WCAG AA.
- [x] **Menu Flottant Tactile Mobile** : Bouton d'action rapide et navigation fluide sur smartphone (`MobileFloatingGlassMenu`).
- [x] **Responsive Absolu & Zero-Overflow** : Audit complet sur tous les formats d'écran (<360px jusqu'aux grands écrans) avec conteneurs flexibles, grilles responsives pour les sélecteurs de tri/groupement et défilement horizontal sécurisé des tableaux.

### 2. Progressive Web App (PWA) & Mobilité
- [x] **Installation Native** : Manifest Web App, Service Worker et carte d'installation flottante pour iOS, Android et Desktop.
- [x] **Résilience & Cache** : Fonctionnement fluide avec mise en cache des ressources critiques.

### 3. Authentification & Sécurité
- [x] Authentification sécurisée par email et mot de passe (**Better Auth**).
- [x] Inscription de nouveaux membres avec gestion des départements et rôles (RBAC : `admin`, `manager`, `member`).
- [x] Murs de confidentialité stricts ("Espace Confidentiel") protégeant l'accès aux données.
- [x] Gestion des sessions chiffrées avec repli local et persistance cross-domaines (Cloud Run / iFrame).

### 4. Gestion des Tâches & Organisation Avancée
- [x] CRUD complet des tâches avec priorisation (Basse, Moyenne, Haute, Urgente) et indicateurs d'échéance.
- [x] **Gestionnaire Centralisé des Catégories & Étiquettes** : Modale interactive pour créer, éditer, assigner des couleurs et icônes personnalisées.
- [x] Assignation dynamique de membres d'équipe et suivi individuel.
- [x] Recherche en temps réel, filtres cumulatifs et réinitialisation rapide.

### 5. Vues Multi-Perspectives & Tableaux de Bord
- [x] **Vue Liste Intelligente** : Groupement dynamique (par Date, Catégorie, Tag, Priorité) et tri multi-critères avec ergonomie mobile adaptée.
- [x] **Vue Calendrier Multi-Échelles** : Vues Mois, Semaine et Jour/Agenda avec panneau tactile détaillé du jour sélectionné.
- [x] **Vue Tableau (Kanban)** : Gestion par colonnes d'avancement avec glisser-déposer et sélecteur d'onglets réactif sur mobile.
- [x] **Vue Statistiques & KPIs** : Taux de complétion global, productivité journalière et graphiques de charge par priorité.

### 6. Assistant IA & Productivité
- [x] **Assistant IA Intégré (Gemini)** : Suggestions d'organisation, décomposition d'objectifs complexes en sous-tâches et priorisation contextuelle.

### 7. Rappels, Alertes & Exports
- [x] Système de rappels programmables avec bannières d'alerte pour les tâches en retard.
- [x] Centre de notifications avec historique et compteur en temps réel.
- [x] **Module d'Exportation** : Export des données de tâches et projets aux formats standards (JSON / CSV).

### 8. Plateforme Collaborative & Circuit de Revue Métier (Maker-Checker)
- [x] **Circuit de Validation Hiérarchique** : Cycle de vie formel des dossiers (`Brouillon` ➔ `Soumis pour Revue` ➔ `En Révision` ➔ `Demande de Corrections` ➔ `Approuvé & Verrouillé`) avec verrouillage d'édition concurrentielle.
- [x] **Visualisation des Modifications (Diff & Audit Trail)** : Comparaison instantanée avant/après des formulaires financiers et surbrillance textuelle des actes juridiques.
- [x] **Journal d'Audit Immuable** : Traçabilité légale complète (auteur, horodatage à la seconde, adresse IP).
- [x] **Passerelles Inter-Pôles** : Décloisonnement fluide entre départements **Fiscalité**, **Comptabilité** et **Juridique**.

---

## 🔮 Évolutions Futures Planifiées (Prochaines Versions)

- [ ] **Synchronisation Calendriers Externes** : Intégration bidirectionnelle Google Calendar via OAuth Workspace.
- [ ] **Génération Automatisée de Rapports PDF** : Modèles de rapports consolidés prêts pour l'impression et les comités de direction.
- [ ] **Notifications Push Web & Mobile** : Alertes en temps réel même lorsque l'application est en arrière-plan.
- [ ] **Automatisations Personnalisées** : Règles d'affectation automatique de tâches selon des déclencheurs métier.
