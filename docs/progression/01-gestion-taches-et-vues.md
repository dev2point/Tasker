---
Jour: Mardi 3 Novembre 2026 (2026-11-03)
Heure de la dernière modif: 09:39:00 PST (17:39:00 UTC)
Auteur: niceboy
Module: Gestion Opérationnelle des Tâches & Vues Métier
---

# 📋 Module 01 — Gestion Opérationnelle des Tâches & Vues Métier

## 1. Description du Module & Enjeux Métier

Le module de gestion des tâches constitue le cœur opérationnel de **mfisca-tasks**. Il est conçu pour les experts fiscaux, juristes d'affaires, auditeurs et assistants de cabinet. Il permet le pilotage précis des échéances fiscales critiques (liasses fiscales, déclarations TVA, audits de restructuration, contrôles fiscaux inopinés) avec une triple exigence :
- **Visibilité calendaire et temporelle stricte** pour éviter tout dépassement d'échéance légale susceptible de générer des pénalités fiscales.
- **Organisation agile et collaborative** grâce à des représentations adaptées (Tableau Kanban, Vue Tabulaire détaillée, Vue Calendrier mensuel/hebdomadaire).
- **Classification analytique fine** par département fiscal, pôle d'activité, statut d'urgence et tags réglementaires personnalisés.

---

## 2. Architecture des Composants & Flux de Données

```
+-------------------------------------------------------------------------+
|                              Header & Sidebar                           |
|       (Sélection du mode de vue : Kanban / Liste / Calendrier)          |
+-------------------------------------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|      KanbanView       |                       |       ListView        |
|  - Drag & Drop        |                       |  - Tri multi-colonnes |
|  - Colonnes par statut|                       |  - Filtres combinés   |
|  - Badges d'urgence   |                       |  - Sélection multiple |
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                             CalendarView                                |
|  - Représentation temporelle des échéances légales                      |
|  - Marqueurs colorés par niveau de criticité & pôle fiscal              |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  Modales & Composants Satellites                        |
|  - TaskModal.tsx : Création & modification complète d'une tâche         |
|  - CategoryTagManagerModal.tsx : Taxonomie & étiquettes fiscales        |
|  - ActiveReminderModal.tsx & OverdueReminderBanner.tsx : Alertes        |
|  - FileVersionManager.tsx : Attachement de pièces justificatives        |
+-------------------------------------------------------------------------+
```

### Fichiers Clés du Module :
- `/components/KanbanView.tsx` : Vue Kanban réactive avec gestion des transitions d'états (À faire, En cours, En revue, Terminé).
- `/components/ListView.tsx` : Vue dense avec tri, pagination locale, filtrage par assigné, priorité, date et département.
- `/components/CalendarView.tsx` : Vue calendrier interactif reprenant les dates d'échéances et autorisant le déplacement direct.
- `/components/TaskModal.tsx` : Modale riche (détails de la tâche, temps estimé/passé, documents associés, niveau de risque fiscal).
- `/components/OverdueReminderBanner.tsx` : Bannière persistante en cas de retard sur échéance réglementaire.
- `/lib/usePlanitStore.ts` : Store global Zustand synchronisé gérant l'état local réactif des tâches et des filtres.

---

## 3. Historique d'Évolution & Avancements Récents

- **Phase 1 :** Implémentation du CRUD de tâches unifié et des filtres de base.
- **Phase 2 :** Intégration du bandeau d'alerte des échéances dépassées (`OverdueReminderBanner.tsx`) et calcul dynamique de l'indice d'urgence.
- **Phase 3 :** Harmonisation avec le modèle de données unifié PostgreSQL / Drizzle pour éviter la disparité des identifiants (IDs alphanumériques vs entiers).
- **Phase 4 :** Ajout de la gestion de versions de pièces jointes (`FileVersionManager.tsx`) permettant de consigner les brouillons d'actes et liasses fiscales révisées.
- **Phase 5 :** Résolution du défaut d'échéance par défaut et verrouillage strict des dates et heures passées :
  - Règle d'échéance par défaut dynamique : heure actuelle + 2h arrondie à l'heure pleine (`getDefaultDueDateTime`).
  - Blocage immédiat de toute sélection de date ou heure révolue (`min` conditionnel sur `<input type="date">` et `<input type="time">`, message d'alerte explicite).
  - Validation serveur dans `POST /api/tasks` avec rejet `HTTP 400` en cas de tentative d'affectation d'une échéance antérieure à la date de création.
  - Couverture par 14 tests unitaires dédiés dans `tests/due-date-validation.test.ts`.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-TSK-04 : [RÉSOLU] Échéance par défaut statique à 14h00 et saisie autorisée de dates passées
- **Statut :** Résolu le 03/11/2026.
- **Description antérieure :** Lors de la création d'une tâche après 14h00, l'échéance par défaut restait fixée à 14h00 le jour même, classant la tâche directement dans « En retard » dès sa création.
- **Solution appliquée :** Module `lib/due-date-utils.ts`, initialisations dynamiques dans `TaskModal.tsx` et `ListView.tsx`, contraintes `min` et rejets `HTTP 400` côté API.

### DT-TSK-01 : Absence de virtualisation sur la vue Liste pour grands volumes
- **Description :** Le composant `ListView.tsx` rend tous les éléments du tableau dans le DOM sans virtualisation (ex. `react-virtual` ou `@tanstack/react-virtual`).
- **Cause racine :** Conçu initialement pour des cabinets gérant des portefeuilles de 50 à 300 tâches actives.
- **Impact :** Dégradation sensible des performances de défilement et de la réactivité UI lorsque le nombre de tâches archivées ou clôturées dépasse 1 000 éléments sur des machines d'entrée de gamme.
- **Plan de remédiation :** 
  1. Implémenter `@tanstack/react-virtual` sur le conteneur du tableau de `ListView.tsx`.
  2. Introduire une pagination côté serveur sur l'API `/api/tasks` pour les portefeuilles volumineux.

### DT-TSK-02 : Drag & Drop dépendant d'un état local asynchrone non-optimiste
- **Description :** Dans `KanbanView.tsx`, lors d'un glisser-déposer de tâche entre deux colonnes de statut, la mise à jour visuelle est synchronisée immédiatement dans Zustand, mais en cas d'échec réseau sur `/api/tasks`, le rollback visuel nécessite un rafraîchissement manuel.
- **Cause racine :** Absence d'un wrapper de mutation optimiste complet avec capture de snapshot antérieur et toast d'erreur automatique avec bouton "Réessayer".
- **Impact :** Légère désynchronisation visuelle possible si la connexion est instable ou coupée en cours de modification.
- **Plan de remédiation :** Encapsuler les transitions d'état dans une fonction transactionnelle avec snapshot de restauration (`previousTasks`) en cas d'erreur HTTP 5xx.

### DT-TSK-03 : Manque de typage strict sur les champs de métadonnées additionnelles
- **Description :** Certains attributs de tâches (ex: `metadata`, `customFields`) utilisent des types flexibles `Record<string, unknown>` ou `any`.
- **Cause racine :** Évolution rapide des besoins des différents pôles fiscaux (TVA, Impôt sur les Sociétés, Prix de Transfert).
- **Impact :** Risque de non-détection d'incompatibilité de type au build time lors de l'ajout de nouveaux formulaires de déclaration.
- **Plan de remédiation :** Définir des schémas Zod stricts pour chaque sous-catégorie fiscale dans `/lib/validations/task-schema.ts`.
