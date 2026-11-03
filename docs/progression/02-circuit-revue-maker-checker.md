---
Jour: Lundi 2 Novembre 2026 (2026-11-02)
Heure de la dernière modif: 00:52:00 PST (08:52:00 UTC)
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
- `/lib/review-service.ts` : Fonctions métier de transition d'états, calculs de délais de révision et déclenchement d'alertes.
- `/lib/presence-service.ts` : Gestion de la présence des relecteurs sur un dossier pour éviter les conflits d'édition.

---

## 3. Historique d'Évolution & Avancements Récents

- **Phase 1 :** Création du modèle de dossier de revue et de l'interface `CollaborativeReviewPlatform`.
- **Phase 2 :** Intégration du module `TextDiffViewer` et `DataDiffViewer` pour la détection fine des altérations de chiffres fiscaux.
- **Phase 3 :** Résolution de la vulnérabilité critique **SEC-05** sur l'endpoint `/api/review/dossiers` : restriction stricte des permissions de mise à jour aux seuls acteurs autorisés (Maker, Checker désigné, Managers et Admins).
- **Phase 4 :** Intégration de la passerelle inter-pôles pour les dossiers fiscaux complexes requérant l'aval conjoint du département Contentieux et du département Conseil.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-REV-01 : Verrouillage concurrent optimiste absent sur le studio de revue
- **Description :** Si deux checkers ou un checker et le maker ouvrent simultanément le même dossier dans `DossierReviewStudioModal.tsx`, la dernière sauvegarde écrase les commentaires ou le statut sans avertir le premier utilisateur.
- **Cause racine :** Absence de champ `version` incrémental ou `updated_at` vérifié côté serveur lors du `PATCH /api/review/dossiers` (concurrence aveugle).
- **Impact :** Risque minime mais réel de perte d'annotations de révision ou de désynchronisation de l'historique lors de révisions simultanées.
- **Plan de remédiation :** 
  1. Ajouter un champ `lock_version: integer` dans la table des dossiers.
  2. Renvoyer une erreur `HTTP 409 Conflict` si la version reçue est inférieure à celle en base.
  3. Afficher un avertissement UI invitant à fusionner les modifications.

### DT-REV-02 : Présence temps réel basée sur le polling HTTP
- **Description :** `presence-service.ts` émet un ping toutes les 15 secondes via `fetch()` pour signaler la présence d'un collaborateur sur un dossier.
- **Cause racine :** Architecture serverless/Next.js sans couche WebSocket bidirectionnelle dédiée en standard.
- **Impact :** Charge inutile sur l'API (plusieurs dizaines de requêtes par minute lors des pics d'affluence) et latence de 15 secondes pour voir qu'un confrère a ouvert le même dossier.
- **Plan de remédiation :** Migrer vers Server-Sent Events (SSE) natif ou un service Pub/Sub géré pour notifier les ouvertures/fermetures de sessions de travail.

### DT-REV-03 : Algorithme de TextDiff non optimisé pour les très longs rapports
- **Description :** `TextDiffViewer.tsx` effectue une comparaison exhaustive par découpage de chaînes en mémoire client.
- **Cause racine :** Implémentation basée sur un algorithme simple de type Myers sans chunking préalable.
- **Impact :** Gel temporaire du thread UI (200 à 400ms) lors de la comparaison de projets de conclusions fiscales de plus de 80 pages.
- **Plan de remédiation :** Déporter le calcul de diff dans un Web Worker dédié ou pré-calculer le diff côté serveur lors du téléversement d'une nouvelle version de document.
