---
Jour: Mardi 3 Novembre 2026 (2026-11-03)
Heure de la dernière modif: 09:18:00 PST (17:18:00 UTC)
Auteur: niceboy
Module: Circuit de Revue & Validation Collaborative (Maker-Checker)
---

# 🛡️ Module 02 — Circuit de Revue & Validation Collaborative (Maker-Checker)

## 1. Description du Module & Enjeux Métier

Le principe **Maker-Checker** (ou principe de double regard à quatre yeux) est une exigence réglementaire et déontologique fondamentale pour les cabinets de conseil fiscal et d'audit comptable. 

Aucun document fiscal ayant une incidence financière ou juridique (mémo de structuration, rescrit fiscal, déclaration rectificative, déclaration de flux transfrontaliers) ne peut être transmis à l'administration ou au client final sans avoir été préalablement :
1. **Élaboré (Maker) :** Par un collaborateur junior, confirmé ou senior.
2. **Scruté & Vérifié (Checker) :** Par un manager, directeur de mission ou associé habilité.
3. **Validé formellement :** Avec horodatage cryptographique, journal d'audit immuable et analyse comparative des versions.

---

## 2. Architecture des Composants & Flux d'Approbation

```
[ Collaborateur / Maker ]
           │
           │  1. Soumission d'un Dossier de Revue
           ▼
[ NewDossierModal.tsx ] ──► Création & attachement des versions documentaires
           │
           ▼
[ /app/api/review/dossiers ] ──► Enregistrement statut "pending_review"
           │
           ▼
[ CollaborativeReviewPlatform.tsx ] ◄── Notifications & Liste de travail du Checker
           │
           ├─► [ InterDepGatewayViewer.tsx ]  (Validation croisée Pôle TVA / IS / Prix de transfert)
           ├─► [ TextDiffViewer.tsx ]          (Comparaison visuelle des clauses textuelles)
           └─► [ DataDiffViewer.tsx ]          (Contrôle des montants financiers & ratios fiscaux)
           │
           ▼
[ DossierReviewStudioModal.tsx ]
           │
           ├─► Rejet motivé ──────────────► Retour au Maker avec annotations
           ├─► Demande d'amendements ─────► Statut "needs_amendment"
           └─► Approbation définitive ────► Statut "approved" + Clôture audit trail
```

### Fichiers Clés du Module :
- `/components/review/CollaborativeReviewPlatform.tsx` : Espace centralisé de tri et de supervision des dossiers en cours de révision.
- `/components/review/DossierReviewStudioModal.tsx` : Studio immersif de revue intégrant la prévisualisation, l'inspection de conformité et la prise de décision.
- `/components/review/TextDiffViewer.tsx` : Moteur de comparaison ligne à ligne avec coloration syntaxique des ajouts/suppressions.
- `/components/review/DataDiffViewer.tsx` : Moteur de rapprochement de tableaux chiffrés et assiettes d'imposition.
- `/components/review/InterDepGatewayViewer.tsx` : Passerelle inter-départements orchestrant les approbations multi-services.
- `/lib/realtime-hub.ts` : Hub singleton d'événements temps réel (Server-Sent Events) pour la diffusion push instantanée.
- `/app/api/events/route.ts` : Endpoint de streaming SSE (`text/event-stream`) avec heartbeat keep-alive et reconnexion automatique.
- `/app/api/review/presence/route.ts` : API de présence synchronisée en direct (lecture/édition) sans latence de polling.
- `/lib/use-realtime-events.ts` : Hook React client avec réactivité immédiate, alertes interactives et retours sonores Web Audio.
- `/lib/review-service.ts` : Fonctions métier de transition d'états, calculs de délais de révision et déclenchement d'alertes.
- `/lib/presence-service.ts` : Gestion de la présence des relecteurs sur un dossier pour éviter les conflits d'édition.

---

## 3. Historique d'Évolution & Avancements Récents

- **Phase 1 :** Création du modèle de dossier de revue et de l'interface `CollaborativeReviewPlatform`.
- **Phase 2 :** Intégration du module `TextDiffViewer` et `DataDiffViewer` pour la détection fine des altérations de chiffres fiscaux.
- **Phase 3 :** Résolution de la vulnérabilité critique **SEC-05** sur l'endpoint `/api/review/dossiers` : restriction stricte des permissions de mise à jour aux seuls acteurs autorisés (Maker, Checker désigné, Managers et Admins).
- **Phase 4 :** Intégration de la passerelle inter-pôles pour les dossiers fiscaux complexes requérant l'aval conjoint du département Contentieux et du département Conseil.
- **Phase 5 (Temps Réel & Server-Sent Events) :** Résolution complète de la dette de synchronisation par la mise en place d'un hub SSE natif (`/api/events`). Diffusion push instantanée des soumissions de dossiers, validations, demandes de corrections, présences d'édition et verrous concurrents sans polling.
- **Phase 6 (Contrôle de Concurrence Optimiste - OCC & Anti-Écrasement) :** Résolution complète de la dette `DT-REV-01`. Ajout du champ incrémental atomique `version` sur les dossiers de revue, validation stricte côté serveur avec rejet `HTTP 409 Conflict` en cas de modification concurrente dépassée, broadcast d'alertes SSE `DOSSIER_CONFLICT`, et modale interactive de résolution permettant le rechargement de la version distante, l'écrasement forcé ou la comparaison visuelle des textes en conflit.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-REV-01 : Verrouillage concurrent optimiste absent sur le studio de revue
- **Description :** Protection contre les écrasements aveugles lors de modifications simultanées par deux relecteurs ou par le Maker et le Checker.
- **Statut :** **✅ Résolu (03/11/2026)**
- **Solution déployée :**
  1. Champ incrémental `version: number` ajouté au schéma `ReviewDossier` (initialisé à 1 à la création).
  2. Contrôle d'intégrité strict dans `PATCH /api/review/dossiers` : rejet avec code statut `HTTP 409 Conflict` si la version transmise par le client est inférieure à la version stockée sur le serveur.
  3. Émission d'un événement SSE `DOSSIER_CONFLICT` notifiant en direct tous les utilisateurs connectés d'une collision d'édition.
  4. Modale dédiée de résolution de conflits dans `DossierReviewStudioModal.tsx` avec 3 options pour l'utilisateur :
     - Recharger la version serveur (abandon des modifications locales obsolètes).
     - Forcer mes modifications (avec le flag `force: true` qui incrémente la version à `serverVersion + 1`).
     - Comparer les textes (diff côte à côte entre la version distante et le brouillon local).
  5. Suite de tests unitaires et d'intégration validée dans `tests/concurrency-lock.test.ts` (5/5 tests passés).

### DT-REV-02 : Synchronisation temps réel par Server-Sent Events (SSE)
- **Description :** Remplacement de l'ancien polling HTTP par un flux d'événements SSE natif haute performance.
- **Statut :** **✅ Résolu (03/11/2026)**
- **Solution déployée :**
  1. Hub `realtimeHub` singleton gérant la souscription et la diffusion push d'événements métier (`DOSSIER_SUBMITTED`, `DOSSIER_VALIDATED`, `DOSSIER_REJECTED`, `PRESENCE_CHANGED`, `DOSSIER_CONFLICT`).
  2. Route de streaming `/app/api/events` au format standard W3C `text/event-stream` avec heartbeat toutes les 20s.
  3. Hook React client `useRealtimeEvents` avec reconnexion exponentielle résiliente, bannières d'alerte interactives et synthèse audio.
  4. Fin du polling périodique superflue et réduction drastique de la charge serveur.

### DT-REV-03 : Algorithme de TextDiff non optimisé pour les très longs rapports
- **Description :** `TextDiffViewer.tsx` effectue une comparaison exhaustive par découpage de chaînes en mémoire client.
- **Cause racine :** Implémentation basée sur un algorithme simple de type Myers sans chunking préalable.
- **Impact :** Gel temporaire du thread UI (200 à 400ms) lors de la comparaison de projets de conclusions fiscales de plus de 80 pages.
- **Plan de remédiation :** Déporter le calcul de diff dans un Web Worker dédié ou pré-calculer le diff côté serveur lors du téléversement d'une nouvelle version de document.
