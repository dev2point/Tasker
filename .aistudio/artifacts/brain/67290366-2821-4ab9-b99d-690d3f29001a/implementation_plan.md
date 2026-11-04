# Plan d'implémentation : Échéance par défaut & Interdiction stricte des dates passées

## Contexte et Problème
Actuellement, lors de la création d'une tâche, l'heure d'échéance par défaut est fixée en dur à `14:00` (`ListView.tsx` et `TaskModal.tsx`). Lorsqu'une tâche est créée l'après-midi (par exemple à 18h25), l'échéance retenue est le jour même à 14h00, ce qui la classe instantanément en **« En retard »** (comme constaté dans la capture).
De plus, aucune contrainte `min` ni validation de formulaire n'empêchait l'utilisateur de sélectionner une date ou une heure révolue pour une nouvelle tâche.

L'utilisateur a spécifié :
1. **Échéance par défaut sans heure spécifiée** : Heure actuelle + 2 heures, arrondie à l'heure pleine suivante (ex : à 18h25 -> 21h00 ; à 23h15 -> lendemain 01h00 ou 02h00).
2. **Contrôle strict des dates/heures passées** : Bloquer la saisie au niveau UI avec attributs `min`, alertes explicites, et rejet côté serveur (API) pour toute nouvelle tâche.

---

## Architecture des Modifications

### 1. Utilitaire centralisé de gestion des échéances (`lib/due-date-utils.ts`)
- `getDefaultDueDateTime(baseDate?: Date)` :
  - Calcule l'heure courante + 2 heures.
  - Arrondit à l'heure pleine suivante (minutes et secondes à `00`).
  - Gère élégamment le passage au jour suivant si dépassement de minuit.
  - Retourne `{ dueDate: 'YYYY-MM-DD', dueTime: 'HH:mm' }`.
- `isDueDateTimeInPast(dueDate: string, dueTime?: string, referenceDate?: Date)` :
  - Compare précisément la date et l'heure (ou fin de journée 23:59:59 si aucune heure spécifiée pour une date passée).
  - Retourne `true` si l'échéance est passée par rapport à `referenceDate` (avec une marge de tolérance de 1 minute pour la saisie).
- `getMinDateStr()` et `getMinTimeForDate(selectedDateStr: string)` :
  - Fournit la chaîne `YYYY-MM-DD` d'aujourd'hui pour l'attribut `min` du sélecteur de date.
  - Si la date sélectionnée est aujourd'hui, fournit `HH:mm` actuel pour l'attribut `min` du champ heure.

### 2. Formulaire modal de tâche (`components/TaskModal.tsx`)
- Remplacer les valeurs initiales statiques `14:00` par `getDefaultDueDateTime()`.
- Pour les nouvelles tâches (`!initialTask`) :
  - Définir `min={getMinDateStr()}` sur le sélecteur `<input type="date" />`.
  - Définir dynamiquement `min={getMinTimeForDate(dueDate)}` sur `<input type="time" />` lorsque `dueDate` est aujourd'hui.
  - Mettre à jour `handleQuickDate('today')` pour ajuster automatiquement l'heure si l'heure courante est déjà supérieure à l'heure pré-remplie.
- Validation à la soumission (`handleSubmit`) :
  - Si la date/heure choisie est dans le passé pour une nouvelle tâche, bloquer l'enregistrement avec le message :
    *« L'échéance d'une tâche ne peut pas être fixée dans le passé. Veuillez choisir une heure future. »*

### 3. Barre de création rapide (`components/ListView.tsx`)
- Remplacer `quickTime` initial (`'14:00'`) par le résultat dynamique de `getDefaultDueDateTime()`.
- Ajouter la contrainte `min` sur le sélecteur de date rapide et sur le champ heure.
- Validation dans `handleQuickAddSubmit` :
  - Empêcher la création si l'échéance saisie est dans le passé avec notification / feedback visuel d'erreur.

### 4. Validation Backend API (`app/api/tasks/route.ts`)
- Dans le gestionnaire `POST /api/tasks` :
  - Lors de la création d'une nouvelle tâche (`!existing`), valider que `dueDate` (et `dueTime`) ne sont pas dans le passé.
  - En cas de violation, répondre avec `HTTP 400 Bad Request` et un payload d'erreur clair :
    `{ error: "L'échéance d'une nouvelle tâche ne peut pas être dans le passé." }`.

### 5. Tests unitaires et de non-régression
- Créer `tests/due-date-validation.test.ts` :
  - Test de `getDefaultDueDateTime` à différents moments de la journée (matin, après-midi 18h25, fin de soirée 23h45).
  - Test de `isDueDateTimeInPast` (dates passées, date du jour avec heure passée, date du jour avec heure future, dates futures).
  - Test de validation API pour interdire les tâches dans le passé.

### 6. Documentation et Progression
- Mettre à jour `/docs/progression/03-gestion-echeances-validation.md` :
  - Entête conforme : `Jour`, `Heure de la dernière modif`, `Auteur: niceboy`.
  - Résumé des correctifs, dette technique identifiée et résolue.
- Mettre à jour `/docs/progression/00-index-progression.md`.

---

## Critères d'acceptation
1. **Création à 18h25** : L'échéance proposée par défaut est aujourd'hui à **21h00** (et non plus 14h00), et la tâche apparaît sous "Aujourd'hui" et NON en "En retard".
2. **Impossible de choisir une date passée** : Les jours antérieurs à aujourd'hui sont grisés/bloqués dans le calendrier.
3. **Impossible de choisir une heure passée aujourd'hui** : Si l'utilisateur choisit la date du jour et saisit une heure déjà écoulée, la saisie est bloquée et une alerte explicite s'affiche.
4. **Rejet API** : Une requête forgeée avec une date passée reçoit une erreur 400.
5. **Suite de tests** : 100% des tests existants et nouveaux passent avec succès.
