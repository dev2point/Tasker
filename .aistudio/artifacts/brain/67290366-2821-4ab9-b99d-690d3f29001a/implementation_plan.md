# Plan d'Implémentation - Refonte Ergonomique du Formulaire de Création de Tâche

## 1. Objectifs & Améliorations UX

- **Structure à 2 colonnes équilibrée (`max-w-4xl` / `max-w-5xl`)** :
  - **Colonne de gauche (Contenu & Contrats)** : Titre de la tâche (saisie proéminente), Pôle / Catégorie, Description détaillée avec zone auto-extensible, Étapes & Sous-tâches interactives, Pièces jointes / Fichiers versionnés.
  - **Colonne de droite (Paramètres & Échéances)** : Statut, Priorité (cartes de sélection visuelles avec badges couleur), Assignation à un membre, Bloc Échéance unifié avec raccourcis rapides (`Aujourd'hui`, `Demain`, `Lundi prochain`), Rappel automatique & Récurrence, Étiquettes / Mots-clés.
- **Pied de Page Fixe & Isolations des Zones de Défilement** :
  - Structure Flexbox stricte `flex flex-col max-h-[90vh]` :
    - En-tête fixe `shrink-0` avec navigation par onglets clairs ("Informations tâche" / "Documents & Versions").
    - Zone de défilement isolée `flex-1 overflow-y-auto px-6 py-5` garantissant qu'aucun champ ne soit chevauché ou masqué.
    - Pied de page fixe `shrink-0 border-t` toujours visible en bas avec boutons d'action (« Annuler » et « Créer la tâche ») + raccourci clavier (`Ctrl + Enter`).
- **Bloc Échéance Unifié & Intelligents Raccourcis** :
  - Boutons d'accès rapide : `Aujourd'hui (18:00)`, `Demain (09:00)`, `Lundi (09:00)`.
  - Champ de saisie de date fluide avec sélecteur d'heure simplifié et case à cocher.
  - Sélection épurée des rappels et de la récurrence.

## 2. Modifications Techniques

- **Fichier impacté** : `components/NewTaskModal.tsx`
  - Élargir la fenêtre modale (`max-w-4xl` / `max-w-5xl`) avec des bordures et effets visuels cohérents avec le thème sombre émeraude.
  - Organiser le contenu en `grid grid-cols-1 lg:grid-cols-12 gap-6`.
  - Colonne principale (`lg:col-span-7 space-y-4`) et colonne latérale (`lg:col-span-5 space-y-4 bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/20`).
  - Intégrer les boutons d'échéance rapide permettant d'ajuster les champs de date/heure en 1 clic.
  - Conserver les fonctionnalités d'IA (découpage de tâche par Gemini) et de gestion des pièces jointes versionnées.

## 3. Plan de Vérification

- **Vérification de la mise en page** :
  - Contrôler l'absence de chevauchement sur le champ Description.
  - Vérifier la réactivité responsive (bascule fluide en 1 colonne sur petit écran).
- **Compilation & Tests** :
  - Exécuter `compile_applet` pour vérifier la validité TypeScript.
  - Lancer `npm test` pour s'assurer du bon fonctionnement des tests unitaires et d'intégration.
