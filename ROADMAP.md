# ROADMAP — Planit

---
> **En-tête de Suivi**
> - **Dernière modification** : 04:01
> - **Date** : 2026-09-15
> - **Auteur** : Agent (Google AI Studio AI Coding Agent)
---

Ce document répertorie l'état d'avancement du projet ainsi que la liste exhaustive des fonctionnalités actuellement disponibles et planifiées.

## ✅ Fonctionnalités Disponibles (v1.0 - Actuelles)

### 1. Authentification & Sécurité
- [x] Authentification sécurisée par email et mot de passe (**Better Auth**).
- [x] Inscription de nouveaux membres avec gestion des départements et rôles (RBAC).
- [x] Murs de confidentialité stricts ("Espace Confidentiel") protégeant l'accès aux données.
- [x] Gestion des sessions chiffrées avec repli local et persistance cross-domaines (Cloud Run / iFrame).

### 2. Gestion des Tâches & Projets
- [x] Création, modification, suppression et clôture de tâches.
- [x] Niveaux de priorité (Basse, Moyenne, Haute, Urgente).
- [x] Catégorisation et gestion par étiquettes (Tags).
- [x] Assignation de membres d'équipe.

### 3. Vues & Navigation
- [x] **Vue Liste** : Tri, recherche instantanée et filtres par statut/priorité.
- [x] **Vue Calendrier** : Visualisation temporelle interactive des échéances et rappels.
- [x] **Vue Tableau (Kanban)** : Glisser-déposer ou bascule rapide entre les colonnes de progression.

### 4. Rappels & Notifications
- [x] Système de rappels programmables avant échéance.
- [x] Compteurs de tâches en retard et notifications non lues.

### 5. Plateforme Collaborative & Circuit de Revue Métier
- [x] **Circuit de Validation Hiérarchique (Maker-Checker)** : Cycle de vie des dossiers (`Brouillon` ➔ `Soumis pour Revue` ➔ `En Révision` ➔ `Demande de Corrections` ➔ `Approuvé & Verrouillé`), attribution dynamique et verrouillage préventif d'édition.
- [x] **Visualisation des Modifications (Diff & Audit Trail)** : Comparaison instantanée avant/après des montants et ratios, surbrillance textuelle (vert/rouge) et journalisation légale immuable (qui, quelle seconde, quelle IP).
- [x] **Collaboration Interdépartements & Temps Réel** : Indicateurs de présence en direct (*Phoenix Presence*), notifications *WebSockets* et passerelles inter-pôles entre départements **Fiscalité**, **Comptabilité** et **Juridique**.
- [x] **Machine à États du Workflow** : Diagramme et moteur d'états formel (`Brouillon`, `Soumis`, `En_Revision`, `Amendements`, `Demande_Corrections`, `Valide`, `Archive`).

---

## 🔮 Évolutions Futures Planifiées (Prochaines Versions)
- [ ] Intégration de calendriers externes (Google Calendar via OAuth Workspace).
- [ ] Rapports analytiques et graphiques de productivité par département.
- [ ] Export des rapports au format PDF/CSV.
- [ ] Mode sombre natif avancé.
