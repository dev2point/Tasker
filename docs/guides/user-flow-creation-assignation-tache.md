# User Flow complet : création, assignation et réception d'une tâche

Ce document décrit le **User Flow actuel** (parcours utilisateur complet, écrans, interactions, retours visuels, droits et limites constatées dans l'application) pour deux acteurs :
- **Utilisateur A (Créateur / Assigneur)** : crée une tâche et l'assigne à un collaborateur.
- **Utilisateur B (Assigné)** : reçoit, consulte et traite la tâche qui lui a été assignée.

---

## 1. Vue d'ensemble du parcours (de A à B)

```text
UTILISATEUR A (Créateur)                         SERVEUR / BASE                    UTILISATEUR B (Assigné)
────────────────────────                         ──────────────                    ───────────────────────
1. Ouvre l'app (session valide) ───────────────► GET /api/users (teamUsers)
                                                 GET /api/tasks
2. Clique « Nouvelle tâche » (TaskModal)
3. Renseigne la tâche + choisit B dans
   « Assigner à un membre »
4. Soumet le formulaire :
   ├─ Affichage immédiat (localStorage/IDB)
   └─ Envoi asynchrone ────────────────────────► POST /api/tasks
                                                 (Auth + validation FKs + UPSERT)
                                                                                   5. Ouvre ou recharge l'app
                                                                                      ◄──── GET /api/tasks
                                                                                      (filtre creator_id OU assignee_id)
                                                                                   6. Voit la tâche dans Liste / Kanban /
                                                                                      Calendrier / Rappels (sans notif push)
                                                                                   7. Consulte, coche sous-tâches, modifie,
                                                                                      reporte ou termine la tâche
                                                                                      (suppression verrouillée)
```

---

## 2. User Flow côté Utilisateur A (Créateur qui assigne)

### Étape A1 — Arrivée dans l'espace de travail
1. L'utilisateur A ouvre l'application.
   - Si une session Better Auth est déjà active côté serveur (SSR), l'espace de travail `HomeWorkspace` s'affiche directement sans flash d'écran de connexion.
   - Sinon, un voile de chargement fluide (`AuthTransitionCurtain`) précède soit l'ouverture de l'espace de travail, soit la porte d'authentification (`AuthGate`).
2. Dès que A est authentifié, le client charge automatiquement en arrière-plan :
   - la liste des collaborateurs (`GET /api/users` ➔ `teamUsers`),
   - la liste des tâches accessibles à A (`GET /api/tasks`).

### Étape A2 — Ouverture de la création de tâche
L'utilisateur A dispose de plusieurs points d'entrée :
- **Parcours permettant l'assignation (nominal)** :
  - Clic sur le bouton **« Nouvelle tâche »** dans la barre latérale (`Sidebar`), l'en-tête (`Header`) ou le menu flottant mobile (`MobileFloatingGlassMenu`).
  - Clic sur le bouton d'ajout depuis `KanbanView`, `CalendarView` (avec date pré-remplie selon la cellule cliquée) ou l'état vide de `ListView`.
  - Ces actions ouvrent la modale **`TaskModal`** en mode édition (`'edit'`).
- **Parcours ne permettant PAS l'assignation actuellement** :
  - L'**ajout rapide en ligne** dans `ListView` et la création via l'**assistant IA** (`AIAssistantModal`) créent immédiatement une tâche non assignée (`assigneeId: undefined`). Pour l'assigner ensuite, A doit rouvrir la tâche en modification dans `TaskModal`.

### Étape A3 — Saisie des détails et choix de l'assigné (`TaskModal`)
Dans l'onglet **« Paramètres de la tâche »** de `TaskModal` :
1. A saisit les champs obligatoires et optionnels :
   - **Titre** (obligatoire), **Description détaillée**,
   - **Catégorie** (avec possibilité de création rapide inline), **Priorité** (`low`, `medium`, `high`, `urgent`), **Statut initial** (`todo`, `in_progress`, `completed`),
   - **Date & heure d'échéance** (raccourcis *Aujourd'hui*, *Demain*, *Lundi prochain* ; toute date/heure passée est refusée à la création avec message d'erreur),
   - **Rappel automatique** et **Récurrence**,
   - **Sous-tâches** (ajout manuel ou génération assistée via `/api/ai/assistant`), **Étiquettes**, et éventuellement **Documents & Suivi des Versions** (onglet dédié).
2. Dans la liste déroulante **« Assigner à un membre »** :
   - Par défaut : *« Non assigné (Toute l'équipe) »*.
   - A sélectionne l'utilisateur B parmi les entrées `teamUsers` affichées au format : `{Nom} ({Département}) - {Rôle}`.

### Étape A4 — Validation et retour utilisateur
1. A clique sur le bouton d'enregistrement :
   - Si le titre est vide ou si l'échéance est dans le passé, un bandeau d'erreur rouge s'affiche dans la modale et la soumission est bloquée.
   - Si le formulaire est valide :
     - Un clic sonore est joué (si activé).
     - `TaskModal` construit le payload avec `assigneeId` (ID de B) et `assigneeName` (nom de B), puis **se ferme immédiatement**.
2. Mise à jour optimiste et persistance :
   - La tâche apparaît **instantanément** en haut des vues de A (Liste, Kanban, Calendrier, Statistiques) via `localStorage` + IndexedDB (`usePlanitStore`), avec le prénom de B affiché dans la métadonnée de la ligne/carte.
   - En parallèle, une requête asynchrone `POST /api/tasks` enregistre la tâche en base PostgreSQL (`creator_id = A`, `assignee_id = B`, champs bornés et validés).
   - **Comportement actuel en cas d'échec serveur** : la requête `POST /api/tasks` est non bloquante ; si le serveur renvoie une erreur (`400`, `401`, `500`), aucun rollback ni alerte d'échec persistante n'est affiché à A (seul un `console.warn` est émis).

### Étape A5 — Suivi ultérieur par l'utilisateur A
- A continue de voir la tâche assignée à B dans toutes ses vues (car `creator_id === A.id`).
- A conserve l'ensemble des droits sur cette tâche : consultation, modification, complétion, duplication et **suppression** (corbeille active dans `ListView`).

---

## 3. User Flow côté Utilisateur B (Assigné qui reçoit la tâche)

### Étape B1 — Réception et découverte de la tâche
1. **Absence d'alerte instantanée à la réception** :
   - Lorsqu'A assigne une tâche à B, **aucune notification in-app** (`NotificationDropdown`), **aucun e-mail** et **aucune poussée temps réel (SSE)** ne sont envoyés à B.
   - Si B a déjà l'application ouverte, il ne voit pas apparaître la nouvelle tâche en direct.
2. **Apparition au chargement ou rafraîchissement** :
   - Lorsque B se connecte ou recharge l'application, `HomeWorkspace` appelle `GET /api/tasks` et `GET /api/users`.
   - Côté serveur, la requête SQL filtre les tâches avec `creator_id = B.id OR assignee_id = B.id` (sauf si B est `admin`, auquel cas il reçoit toutes les tâches).
   - La tâche créée par A arrive dans le store client de B, puis passe le filtre RBAC `filterTasksForUser` (`canUserViewTask` retourne `true` car `task.assigneeId === B.id`).

### Étape B2 — Affichage dans les vues principales de B
La tâche apparaît dans les différentes vues de B :
- **Vue Liste (`ListView`)** :
  - Ligne avec bande de priorité, titre, catégorie, échéance, indicateur de rappel, progression des sous-tâches et étiquettes.
  - **Détail d'affichage constaté** : `GET /api/tasks` ne stocke et ne retourne que `assigneeId` (pas `assigneeName`), et `ListView` ne reçoit pas `teamUsers`. Sur une session fraîchement synchronisée depuis PostgreSQL, le prénom de B (`task.assigneeName`) n'apparaît donc pas dans la ligne de `ListView`.
- **Vue Kanban (`KanbanView`)** :
  - Carte affichée dans la colonne correspondant au statut (`todo`, `in_progress`, `completed`), avec boutons fléchés pour faire avancer/reculer le statut. (Même remarque concernant `task.assigneeName` non hydraté depuis PostgreSQL.)
- **Vue Calendrier (`CalendarView`) et Statistiques (`StatsView`)** :
  - La tâche compte dans les échéances du jour/semaine/mois et dans les indicateurs d'activité de B.

### Étape B3 — Ouverture et consultation de la tâche (`TaskModal` mode `'view'`)
Lorsque B clique sur le titre ou la carte de la tâche, `TaskModal` s'ouvre en **mode consultation (`'view'`)** :
- **Collaborateur assigné** : affiche bien le **nom complet de B** (résolu dynamiquement depuis `teamUsers` grâce à `assigneeId`).
- **Récurrence & Créateur** : affiche `• Créé par {creatorName}` si présent en cache local, sinon affiche le texte générique **`« • Créé par l’équipe »`** (car `creator_name` n'est pas stocké en PostgreSQL et `TaskModal` ne résout pas `creatorId` via `teamUsers`).
- **Contenu** : priorité, statut, catégorie, date/heure d'échéance, rappel automatique, description, étiquettes, documents attachés (le cas échéant) et **checklist interactive des sous-tâches**.

### Étape B4 — Actions possibles et restrictions pour l'utilisateur B

| Action | Accessible à B ? | Comment B l'effectue | Ce qui se passe |
| :--- | :---: | :--- | :--- |
| **Cocher des sous-tâches** | **Oui** | Directement en mode consultation dans `TaskModal` ou en dépliant la tâche dans `ListView` | Met à jour le taux d'avancement immédiatement et envoie `POST /api/tasks` (autorisé côté serveur car `assigneeId === B.id`). |
| **Marquer la tâche terminée / rouvrir** | **Oui** | Case à cocher dans `ListView`, bouton **« Marquer comme terminée »** dans `TaskModal`, ou flèches de colonne dans `KanbanView` | Met à jour `completed` / `status` / `completedAt` et persiste via `POST /api/tasks`. *(Note : aucun contrôle RBAC n'est posé sur les boutons de changement de statut de `KanbanView`, même logique autorisée pour l'assigné).* |
| **Reporter l'échéance (`+1j`)** | **Oui** | Bouton `+1j` en `ListView` ou `+1j Reporter` dans `TaskModal` | Décale `dueDate` de +1 jour, réinitialise le rappel et persiste via `POST /api/tasks`. |
| **Modifier les détails / réassigner** | **Oui** | Bouton **« Modifier la tâche »** (`TaskModal`) ou icône crayon (`ListView`) | Bascule `TaskModal` en mode `'edit'`. B peut modifier titre, description, échéance, sous-tâches, tags ou même changer l'assigné ; `POST /api/tasks` autorise la mise à jour car `existing.assigneeId === B.id`. |
| **Dupliquer la tâche** | **Oui** | Icône copier dans `ListView` | Crée une copie locale + `POST /api/tasks` dont **B devient le nouveau créateur**. |
| **Supprimer la tâche** | **Non** *(sauf Admin)* | Icône corbeille grisée/désactivée dans `ListView` | Bloquée côté UI par `canUserDeleteTask` (infobulle : *« Seul le créateur ou l'administrateur peut supprimer cette tâche »*) et refusée en `403 Forbidden` par `DELETE /api/tasks`. |

### Étape B5 — Rappels et notifications pendant la session de B
1. **Rappels d'échéance automatiques** :
   - Toutes les 10 secondes, la session de B évalue les rappels (`evaluateReminders`) sur ses tâches visibles non terminées.
   - À l'heure configurée (`reminderMinutesBefore`), B reçoit : un signal sonore, une notification navigateur, une entrée dans la cloche `NotificationDropdown` et l'ouverture de la modale `ActiveReminderModal` (avec actions : *Terminer*, *Reporter le rappel*, *Demain 9h*, *+1 jour*).
2. **Cas particulier d'une intervention Administrateur** :
   - Si un administrateur modifie ou supprime la tâche assignée à B, une notification ciblée (`buildAdminActionNotification`) est générée pour B (`targetUserId`) et une entrée d'audit est enregistrée dans `activity_logs`.

---

## 4. Synthèse des écarts UX constatés dans le flux actuel

1. **Pas de notification d'assignation pour B** : aucune alerte (cloche in-app, toast ou SSE) n'informe B qu'une nouvelle tâche vient de lui être assignée par A.
2. **Rafraîchissement requis côté B** : `POST /api/tasks` ne diffuse pas d'événement SSE `TASK_UPDATED` ; un utilisateur B déjà connecté doit recharger la page ou déclencher une synchronisation pour voir apparaître la tâche.
3. **Noms non résolus depuis PostgreSQL dans plusieurs affichages** :
   - Sur un chargement depuis la base (qui stocke uniquement `creator_id` et `assignee_id`), `ListView` et `KanbanView` n'affichent pas le prénom de l'assigné, et `TaskModal` affiche *« Créé par l’équipe »* au lieu du nom de A.
   - De même, les `trackedFiles` attachés dans `TaskModal` ne disposent pas de colonne dédiée dans la table PostgreSQL `tasks` et restent locaux au navigateur de A.
4. **Absence de retour d'erreur serveur lors de la sauvegarde** : la persistance optimiste masque les éventuels rejets réseau ou serveur de `POST /api/tasks`.
