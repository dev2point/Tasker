# Flux complet : création et assignation d'une tâche à un autre utilisateur

Ce document décrit le fonctionnement réel et complet tel qu'implémenté actuellement dans le code source pour un utilisateur **A (Créateur)** qui crée une tâche et l'assigne à un utilisateur **B (Assigné)**, depuis le chargement initial de l'application jusqu'à la consultation et la manipulation de la tâche par l'assigné.

---

## 1. Vue d'ensemble du flux

```text
[Client A : HomeWorkspace]
   │ 1. Chargement initial : GET /api/users + GET /api/tasks
   ▼
[Client A : TaskModal]
   │ 2. Sélection d'un membre dans `teamUsers` (assigneeId) + validation formulaire
   ▼
[Client A : HomeWorkspace.handleSaveTask]
   │ 3a. Écriture optimiste immédiate -> localStorage + IndexedDB (usePlanitStore)
   │ 3b. Requête asynchrone -> POST /api/tasks
   ▼
[Serveur : app/api/tasks/route.ts]
   │ 4. Auth Better Auth -> ensureDatabaseTables -> résolution user -> validation FKs
   │ 5. Assainissement (`sanitizeTaskForPostgres`) -> UPSERT dans PostgreSQL (`tasks`)
   ▼
[Client B : HomeWorkspace]
   │ 6. Chargement (ou rechargement) : GET /api/tasks filtré par `creator_id` OU `assignee_id`
   │ 7. Filtrage RBAC client (`lib/rbac.ts`) + droits voir / compléter / éditer (suppression interdite)
```

---

## 2. Pré-requis et chargement des données (`HomeWorkspace` + API)

### 2.1. Authentification et déclenchement du chargement
Dans `components/HomeWorkspace.tsx` :
1. L'utilisateur A est authentifié via Better Auth (`sessionUser` / `effectiveAuthPhase === 'authenticated'`).
2. Dès que le composant est monté et que `authenticatedUserId` est défini, `loadRemoteData()` exécute en parallèle :
   - `GET /api/users`
   - `GET /api/tasks`

### 2.2. Chargement de la liste des membres assignables (`GET /api/users`)
Dans `app/api/users/route.ts` :
1. Vérification de la session via `getAuthenticatedUser(req)` (renvoie `401` si non authentifié).
2. Vérification/initialisation du schéma PostgreSQL via `ensureDatabaseTables()`.
3. Requête Drizzle `db.select().from(userTable)` sur la table unifiée `"user"`.
4. Retourne `{ source: 'postgresql_supabase', users: formatted }` (liste complète des collaborateurs avec `id`, `name`, `email`, `role`, `department`, `pole`, `grade`, `status`, `avatarUrl`).
5. Côté client, `HomeWorkspace` stocke ce résultat dans `teamUsers` (`setTeamUsers(data.users)`), puis le transmet en prop à `TaskModal` et `AdminView`.

> **Mode hors-ligne (sans `DATABASE_URL`)** : `/api/users` retourne `{ source: 'offline', users: [] }`. Le sélecteur d'assignation dans `TaskModal` ne contiendra alors aucun membre distant.

---

## 3. Interface de création et d'assignation (`TaskModal`)

### 3.1. Points d'entrée UI
- L'assignation à la création passe **exclusivement par `TaskModal`** (ouvert en mode `'edit'` via `handleOpenTaskModal(undefined, defaultDate, 'edit')` depuis `Sidebar`, `Header`, `MobileFloatingGlassMenu`, `ListView`, `KanbanView` ou `CalendarView`).
- L'ajout rapide en ligne dans `ListView` (`handleQuickAddTask`) et la création via `AIAssistantModal` n'exposent pas de sélecteur d'assigné et produisent des tâches avec `assigneeId: undefined`.

### 3.2. Sélection de l'utilisateur B dans `TaskModal`
Dans `components/TaskModal.tsx` (`TaskModalInner`) :
1. Un champ `<select>` (**« Assigner à un membre »**) est lié à l'état local `assigneeId` :
   - Option par défaut : `""` (« Non assigné (Toute l'équipe) »).
   - Une option par utilisateur de `teamUsers` : `value={u.id}`, affichant `{u.name} ({u.department}) - {u.role}`.
2. Lors de la soumission (`handleSubmit`) :
   - Validation du titre obligatoire (`title.trim()`).
   - Validation stricte de l'échéance : pour une nouvelle tâche (`!initialTask`), `isDueDateTimeInPast(dueDate, hasTime ? dueTime : undefined)` bloque toute date/heure passée.
   - Recherche de l'objet utilisateur assigné : `const assignedUser = teamUsers.find((u) => u.id === assigneeId)`.
   - Construction de `taskPayload` (`Partial<Task>`) incluant notamment :
     - `assigneeId: assigneeId || undefined`
     - `assigneeName: assignedUser ? assignedUser.name : undefined`
     - `title`, `description`, `dueDate`, `dueTime`, `priority`, `category`, `reminderMinutesBefore`, `recurrence`, `status`, `completed`, `subtasks`, `tags`, `trackedFiles`.
   - Appel de `onSaveTask(taskPayload)` puis fermeture immédiate de la modale (`onClose()`).

---

## 4. Traitement client et mise à jour optimiste (`HomeWorkspace.handleSaveTask`)

Dans `components/HomeWorkspace.tsx` (`handleSaveTask`, branche création sans `taskPayload.id`) :

1. **Re-vérification de l'échéance** : `isDueDateTimeInPast(finalDueDate, finalDueTime)` bloque la création et envoie une notification navigateur en cas d'échéance passée.
2. **Construction de l'objet `Task`** :
   - `id` généré côté client : `'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)`
   - `creatorId: currentUser?.id`
   - `creatorName: currentUser?.name`
   - `assigneeId: taskPayload.assigneeId`
   - `assigneeName: taskPayload.assigneeName`
   - `assigneeAvatar: taskPayload.assigneeAvatar`
   - `createdAt` et `updatedAt` à `nowIso`, `reminderTriggered: false`.
3. **Double écriture optimiste en parallèle** :
   - **Stockage local (`saveTasks([newTask, ...tasks])`)** via `lib/usePlanitStore.ts` :
     - Met à jour `localStorage` (`planit_tasks_v1`).
     - Notifie immédiatement les abonnés React (`useSyncExternalStore`) : la tâche apparaît instantanément dans l'interface de l'utilisateur A.
     - Persiste en arrière-plan dans IndexedDB (`dbPutAllTasks`).
   - **Persistance serveur (`persistTaskToDb(newTask)`)** :
     - Appelle `fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask) })`.
     - Cette requête est « fire-and-forget » : l'interface n'attend pas le retour HTTP et journalise simplement un avertissement (`console.warn`) en cas d'erreur réseau.

---

## 5. Traitement serveur et persistance PostgreSQL (`POST /api/tasks`)

Dans `app/api/tasks/route.ts` :

1. **Vérification d'authentification (`getAuthenticatedUser(req)`)** (`lib/auth-server.ts`) :
   - Vérifie la session Better Auth (`auth.api.getSession`) ou, en repli, le jeton `Bearer` / cookie `better-auth.session_token` dans la table `"session"`.
   - Retourne `401` si l'utilisateur n'est pas authentifié.
2. **Mode hors-ligne** : si PostgreSQL n'est pas configuré (`!db || !isDatabaseConfigured()`), retourne `200` avec `{ message: 'Database not connected, task saved in local storage' }`.
3. **Initialisation / vérification du schéma** : appelle `ensureDatabaseTables()` (`lib/db/pg.ts`), mémoïsé sur `globalThis`, qui garantit l'existence des tables et des clés étrangères vers `"user"(id)`.
4. **Résolution sûre de l'utilisateur authentifié dans `"user"`** :
   - Recherche `user.id` dans `"user"`.
   - S'il est absent, tente une insertion `.onConflictDoNothing()` puis une relecture par `id` ou par `email` pour obtenir `resolvedAuthUserId` sans provoquer d'erreur d'unicité sur l'e-mail.
5. **Validation métier** :
   - Vérifie si `tasks.id` existe déjà (`existing`).
   - En création (`!existing`), rejette avec `400` si `isDueDateTimeInPast(taskData.dueDate, taskData.dueTime)` est vrai.
6. **Validation des clés étrangères avant écriture** :
   - `validCreatorId` : prend `taskData.creatorId || resolvedAuthUserId || user.id`, vérifie son existence dans `"user"`, sinon se rabat sur `resolvedAuthUserId`.
   - `validAssigneeId` : prend `taskData.assigneeId || null`, vérifie son existence dans `"user"`, sinon force `null` (évite une erreur FK si l'ID est invalide ou supprimé).
   - `validWorkspaceId` : prend `taskData.workspaceId || null`, vérifie son existence dans `workspaces`, sinon force `null`.
7. **Assainissement des données (`lib/db/task-sanitize.ts`)** :
   - `sanitizeTaskForPostgres` borne toutes les colonnes `VARCHAR` (`id` ≤ 64, `title` ≤ 500, `dueDate` ≤ 32, `dueTime` ≤ 16, `priority`/`status`/`recurrence`/`color` ≤ 32, `category` ≤ 64), valide les dates (`toValidDateOrNull`), annule `completedAt` si `completed` vaut `false`, et normalise `tags` et `subtasks` pour JSONB.
8. **Insertion / Mise à jour SQL (`UPSERT`)** :
   - Exécute `db.insert(tasks).values(pgTask).onConflictDoUpdate({ target: tasks.id, set: ... })`.
   - Retourne `{ success: true }` (HTTP `200`), ou HTTP `500` avec le détail PostgreSQL (`causeDetail`) en cas d'échec SQL.

---

## 6. Réception, affichage et permissions côté utilisateur assigné (B)

### 6.1. Récupération des tâches depuis PostgreSQL (`GET /api/tasks`)
Lorsque l'utilisateur B ouvre ou recharge l'application (`loadRemoteData` ➔ `GET /api/tasks`) :
- Si `user.role === 'admin'`, le serveur renvoie toutes les tâches de la table `tasks`.
- Si `user.role !== 'admin'`, le serveur filtre la requête SQL par :
  ```ts
  or(eq(tasks.creatorId, user.id), eq(tasks.assigneeId, user.id))
  ```
- La tâche créée par A avec `assignee_id = B.id` est donc bien renvoyée à B.
- Le résultat remplace le store local de B (`setTasks(tasksData.tasks)`).

### 6.2. Filtrage et droits RBAC côté client (`lib/rbac.ts`)
Dans `HomeWorkspace.tsx`, `visibleTasks = filterTasksForUser(tasks, currentUser)` applique les règles suivantes pour l'utilisateur B :

| Action | Fonction RBAC | Autorisation pour l'assigné (B) | Remarques |
| :--- | :--- | :---: | :--- |
| **Voir la tâche** | `canUserViewTask` | **Autorisé** | Vérifie `task.assigneeId === user.id` (avec repli par nom/e-mail `assigneeName`). |
| **Marquer terminée / changer le statut** | `canUserCompleteTask` | **Autorisé** | L'assigné, le créateur et l'admin peuvent compléter la tâche. |
| **Modifier les détails / sous-tâches** | `canUserEditTask` | **Autorisé** | L'assigné peut éditer la tâche dans `TaskModal`, `ListView` et `KanbanView`. |
| **Supprimer la tâche** | `canUserDeleteTask` | **Refusé** | Seuls le **créateur** (`creatorId === B.id`) et l'**admin** peuvent supprimer. Également bloqué côté serveur dans `DELETE /api/tasks` (HTTP `403`). |

### 6.3. Rappels automatiques
Une fois la tâche présente dans `visibleTasks` de l'utilisateur B, la boucle d'évaluation des rappels (`evaluateReminders` toutes les 10 secondes dans `HomeWorkspace`) surveille l'échéance et déclenche l'alerte sonore, la modale `ActiveReminderModal` et la notification navigateur si les rappels sont actifs.

---

## 7. Points d'attention et limites de l'implémentation actuelle

1. **Absence de diffusion temps réel (SSE) pour les tâches** :
   - Le type `'TASK_UPDATED'` existe dans `lib/realtime-hub.ts` et `lib/use-realtime-events.ts`, mais `POST /api/tasks` ne publie aucun événement sur `realtimeHub`.
   - L'utilisateur B déjà connecté ne voit donc pas la nouvelle tâche apparaître automatiquement sans rechargement de page ou synchronisation manuelle (`/api/sync`).
2. **Absence de notification dédiée lors d'une assignation** :
   - Lorsqu'un administrateur modifie ou supprime la tâche d'un tiers, `HomeWorkspace` crée une notification (`buildAdminActionNotification`) et `POST /api/tasks` enregistre une entrée dans `activity_logs`.
   - En revanche, lorsqu'un utilisateur A crée et assigne une tâche à B, aucune notification ciblée (`TaskNotification`) ni ligne `activity_logs` n'est créée en base pour prévenir B.
3. **Champs locaux absents du schéma SQL `tasks`** (`src/db/schema.ts`) :
   - La table `tasks` stocke `creator_id` et `assignee_id`, mais ne possède pas de colonnes `creator_name`, `assignee_name`, `assignee_avatar` ni `tracked_files`.
   - Sur une session fraîche côté B alimentée par `GET /api/tasks`, ces métadonnées purement locales ne sont donc pas hydratées depuis PostgreSQL.
4. **Persistance optimiste sans annulation (rollback)** :
   - Comme `saveTasks` met à jour `localStorage`/IndexedDB avant la réponse de `POST /api/tasks`, un refus serveur (`400`, `401`, `500`) n'annule pas la tâche dans l'interface locale de A et n'affiche pas de bannière d'erreur persistante.
