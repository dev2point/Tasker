# ROADMAP — Planit

---
> **En-tête de Suivi**
> - **Dernière modification** : 07:39
> - **Date** : 2026-09-14
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

---

## 🔮 Évolutions Futures Planifiées (Prochaines Versions)
- [ ] Intégration de calendriers externes (Google Calendar via OAuth Workspace).
- [ ] Rapports analytiques et graphiques de productivité par département.
- [ ] Export des rapports au format PDF/CSV.
- [ ] Mode sombre natif avancé.
