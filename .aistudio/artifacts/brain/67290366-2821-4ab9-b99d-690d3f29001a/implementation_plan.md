# Refonte de la Bannière des Tâches en Retard & Mode Consultation Dédié

Plan d'action ergonomique et technique pour restreindre la bannière des tâches en retard à une largeur compacte sur grand écran, rendre chaque tâche directement cliquable individuellement sans bouton redondant, et afficher une modale de consultation dédiée (lecture seule structurée avec bascule vers l'édition).

## Décisions Clés & Réponses Validées

> [!IMPORTANT]
> Les trois arbitrages ergonomiques confirmés avec l'utilisateur sont intégrés au plan d'exécution :

- **Format de la bannière** : Carte compacte `max-w-xl` (au lieu de s'étaler sur 100% de la largeur desktop/tablette), intégrée avec bordure rose sombre, micro-interactions fluides et actions rapides de report.
- **Sélection des tâches en retard** : Suppression du bouton « Voir » isolé ; chaque tâche en retard est présentée dans une liste interactive avec puce d'état, titre tronqué proprement et échéance, immédiatement cliquable.
- **Affichage de la tâche** : Clic sur une tâche ouvre d'abord une **modale de consultation** claire (titre, statut, catégorie, priorité, échéance, sous-tâches interactives, documents attachés) avec un bouton dédié « Modifier la tâche » pour activer le formulaire complet d'édition.

---

## 1. Vue d'Ensemble & Objectifs UX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VUE PRINCIPALE                                 │
│                                                                             │
│  ┌──────────────────────────────────────────────────┐                      │
│  │ ⚠️  2 tâches en retard      [Reporter ▼]         │  <-- max-w-xl         │
│  │ ──────────────────────────────────────────────── │      (compacte,       │
│  │ • Déployer l'App  · 28 sept. à 16:47     [+1j]   │       non étalée)     │
│  │ • Clôture Fiscale · 27 sept. à 18:00     [+1j]   │                       │
│  └───────────────────────┬──────────────────────────┘                       │
│                          │ (Clic sur la tâche)                              │
│                          ▼                                                  │
│  ┌────────────────────────────────────────────────────────┐                 │
│  │           MODALE DE CONSULTATION (Lecture Seule)       │                 │
│  │  [Fiscalité]  [Élevée]  [En retard]                    │                 │
│  │  Déployer l'App                                        │                 │
│  │  Échéance : 28 sept. à 16:47 (Rappel 15 min avant)     │                 │
│  │  Assigné à : Jean Dupont                               │                 │
│  │  Sous-tâches (2/3)  ·  Fichiers attachés (1)           │                 │
│  │ ────────────────────────────────────────────────────── │                 │
│  │  [Terminer la tâche]   [Reporter]   [Modifier la tâche]│                 │
│  └────────────────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Problèmes résolus :
1. **Étalement visuel excessif** : La bannière rose occupait toute la largeur de l'écran principal (plus de 1200px sur grand écran), créant un déséquilibre et un sentiment de vide.
2. **Action d'ouverture indirecte et ambiguë** : Le bouton « Voir » ne précisait pas quelle tâche était consultée en cas de pluralité de tâches en retard.
3. **Confusion consultation vs édition** : L'ouverture directe du formulaire d'édition complet obligeait l'utilisateur à voir des champs d'édition bruts, risquant des modifications accidentelles alors qu'il souhaitait simplement lire ou vérifier la tâche.

---

## 2. Expérience Utilisateur & Design Visuel

### A. Bannière Compacte des Tâches en Retard (`OverdueReminderBanner`)
- **Largeur contrainte** : `max-w-xl w-full` (environ 576px max), alignée proprement avec la grille du contenu principal.
- **En-tête de synthèse** : Puce d'alerte rose pulsante, compteur global (`X tâches en retard`), badge `Action requise` et menu déroulant global de report rapide.
- **Liste interactive des tâches** :
  - Chaque tâche est un item interactif avec transition `hover:bg-rose-900/30`, curseur pointer et retour haptique/sonore discret.
  - Puce d'état prioritaire, titre net, date d'échéance formatée et raccourci inline `+1j`.
  - Clic direct sur la ligne déclenche l'ouverture de la tâche en mode consultation.

### B. Modale de Consultation Dédiée (`TaskModal` en mode 'view')
- **Mode « Consultation » par défaut lors du clic** :
  - En-tête avec badge catégorie coloré, badge priorité (Urgent / Élevée / Moyenne / Basse), indicateur de retard ou d'échéance.
  - Titre en grand format typographique lisible (`text-lg font-bold text-white`).
  - Bloc métadonnées clair (Échéance exacte, Rappel automatique, Pôle / Catégorie, Assigné, Créateur).
  - Description complète rendue avec retour à la ligne préservé.
  - Section sous-tâches avec possibilité de cocher/décocher directement en direct.
  - Section documents & versions avec aperçu direct des fichiers liés.
  - Tags cliquables pour filtrer les tâches.
- **Barre d'actions contextuelles** :
  - Bouton **« Marquer comme terminée »** (vert émeraude).
  - Bouton **« Reporter »** (+1j / +3j / +7j).
  - Bouton **« Modifier la tâche »** (icône crayon) : bascule instantanément la modale dans le formulaire d'édition complet.
  - Bouton de fermeture rapide (touche Echap ou clic extérieur).

---

## 3. Architecture Technique & Modifications

### Fichiers impactés :
1. `components/OverdueReminderBanner.tsx` :
   - Restreindre le conteneur à `max-w-xl`.
   - Remplacer le bouton unique « Voir » par une liste détaillée et cliquable de toutes les tâches en retard.
   - Transmettre l'ouverture de tâche avec drapeau explicite `mode: 'view'`.
2. `components/TaskModal.tsx` :
   - Ajouter un prop `initialMode?: 'view' | 'edit'` (par défaut `'edit'` pour une création, `'view'` lors d'un clic d'inspection).
   - Intégrer l'écran de consultation structuré (lecture seule agréable, typographie soignée).
   - Bouton de bascule fluide `onClick={() => setMode('edit')}`.
3. `app/page.tsx` :
   - Gérer l'état `taskModalMode: 'view' | 'edit'`.
   - Mettre à jour `handleOpenTaskModal(task, mode = 'view')`.

---

## 4. Stratégie de Validation & Tests
- Exécution de `npm test` pour s'assurer que les 76 tests existants restent 100% au vert.
- Vérification du comportement responsive : desktop (>1024px), tablette (768px-1023px) et mobile (<768px).
- Compilation finale propre via `compile_applet`.
