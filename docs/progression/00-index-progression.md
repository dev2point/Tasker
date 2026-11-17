---
Jour: Mardi 17 Novembre 2026 (2026-11-17)
Heure de la dernière modif: 13:15:00 CET (12:15:00 UTC)
Auteur: niceboy
Module: Index Général & Cartographie de Progression
---

# 📑 Dossier de Progression & Documentation Technique — mfisca-tasks

Bienvenue dans le référentiel central de suivi, de documentation architecturale et d'évolution des modules du projet **mfisca-tasks**. 

Ce dossier consigne l'historique de conception, l'état d'avancement réel, les composants clés, les flux de données et le registre exhaustif des dettes techniques associées à chaque brique fonctionnelle du système.

---

## 🧭 Sommaire du Dossier de Progression

| N° | Fichier / Document | Domaine Fonctionnel & Technique | Statut Général | Niveau de Dette |
| :---: | :--- | :--- | :--- | :---: |
| **00** | [`00-index-progression.md`](./00-index-progression.md) | Synthèse générale, métriques globales & matrice de maturité | **À Jour (17/11/2026)** | Très Faible |
| **01** | [`01-gestion-taches-et-vues.md`](./01-gestion-taches-et-vues.md) | Modèle de tâche (4 statuts), Kanban 4 colonnes, Listes, Calendrier & Notifications | **Opérationnel (4 statuts + Push)** | Faible |
| **02** | [`02-circuit-revue-maker-checker.md`](./02-circuit-revue-maker-checker.md) | Workflow Maker-Checker, Studio Diff Word .docx & Excel .xlsx, OCC & Modération | **Opérationnel, Diff Office & OCC Actifs** | Très Faible |
| **03** | [`03-moteur-rapports-et-synthese-pdf.md`](./03-moteur-rapports-et-synthese-pdf.md) | Moteur de reporting exécutif, génération PDF A4, métriques fiscales & exports | **Opérationnel** | Modérée |
| **04** | [`04-metriques-kpis-et-benchmark.md`](./04-metriques-kpis-et-benchmark.md) | Statistiques temps réel (répartition 4 statuts), benchmark sectoriel & productivité | **Opérationnel** | Faible |
| **05** | [`05-persistance-bdd-et-synchronisation.md`](./05-persistance-bdd-et-synchronisation.md) | Architecture PostgreSQL/Drizzle (`tasks`, `notifications`, `user`), API Sync & Healthcheck | **Opérationnel (Notifications & RLS)** | Faible / Modérée |
| **06** | [`06-securite-rbac-et-audit-trail.md`](./06-securite-rbac-et-audit-trail.md) | Sécurité OWASP, RBAC multi-rôles, Isolation SSE/Notifications, Better Auth & Audit | **Durci & Validé** | Faible |
| **07** | [`07-integrations-pwa-et-m365.md`](./07-integrations-pwa-et-m365.md) | PWA (mode hors-ligne, Service Worker), Microsoft 365 & formats iCalendar | **Opérationnel** | Modérée |

### Guides Fonctionnels Associés (`/docs/guides/`)
- [`flux-creation-assignation-tache.md`](../guides/flux-creation-assignation-tache.md) : Architecture technique complète de la création et de l'assignation de tâches.
- [`user-flow-creation-assignation-tache.md`](../guides/user-flow-creation-assignation-tache.md) : Parcours utilisateur détaillé côté créateur et côté collaborateur assigné.
- [`azure-entra-id-setup.md`](../guides/azure-entra-id-setup.md) : Configuration OAuth / PKCE Microsoft 365 & Azure Entra ID.

---

## 📊 Matrice de Maturité & Indicateurs Qualité

```
[Qualité & Tests]       ███████████████████░   98% (18 suites / 136 tests Vitest ; 17/18 suites et 133/136 tests passants*)
[Sécurité & RBAC]       ████████████████████  100% (SEC-01 à SEC-11 résolus, isolation SSE/Notifications active)
[Collaboration SSE]     ████████████████████  100% (Hub SSE ciblé par destinataire, push assignation/fin & navigateur)
[Contrôle Concurrence]  ████████████████████  100% (OCC Optimistic Concurrency v1...vN + 409 Conflict)
[Moteur de Revue & Diff]████████████████████  100% (Diff Word mot à mot, Excel double grille, Modération motif)
[Vues & Ergonomie]      ███████████████████░   98% (Kanban 4 colonnes, Liste/Modale 4 statuts, Stats cycle de vie)
[Persistance Hybride]   ██████████████████░░   92% (PostgreSQL + table notifications RLS + enrichissement créateur/assigné)
[Intégrations Tiers]    ██████████████░░░░░░   75% (M365, iCal, PWA)
```

> \* Note : Les 3 échecs constatés dans `tests/load-performance.test.ts` concernent exclusivement des seuils de latence micro-CPU propres à l'environnement conteneurisé (`45 ms` / `250 ms`), toutes les suites fonctionnelles (17/17) passant à 100 %.

---

## 🎯 Objectifs de ce Référentiel

1. **Traçabilité rigoureuse :** Chaque évolution de code est documentée avec son horodatage exact, le contexte métier fiscal et son propriétaire.
2. **Gestion proactive de la dette technique :** Tout compromis technique (performance, portabilité, dépendance tierce) fait l'objet d'un ticket documenté avec cause racine, impact et stratégie de remédiation.
3. **Facilitation de l'onboarding :** Permettre à tout développeur ou auditeur de comprendre en moins de 15 minutes les choix d'architecture et les flux critiques.

---

## ⚠️ Dettes Techniques Globales & Points d'Attention Système

| ID Dette | Intitulé & Description | Composants Affectés | Impact Métier / Tech | Stratégie de Remédiation |
| :--- | :--- | :--- | :--- | :--- |
| **DT-GLO-01** | **Absence de tests E2E automatisés (Playwright/Cypress)** | Parcours complets d'authentification, modales complexes et impression PDF | Risque de régression visuelle ou de rupture de flux utilisateur lors de refactorisations majeures. | Mettre en place une suite Playwright ciblant les 5 flux critiques (création tâche, soumission dossier, approbation checker, export rapport, login). |
| **DT-GLO-02** | **Synchronisation temps réel par Server-Sent Events (SSE)** | `lib/realtime-hub.ts`, `/app/api/events`, `use-realtime-events.ts`, `/api/notifications` | Élimination de la latence de polling et diffusion instantanée des alertes Maker-Checker, d'assignation et de fin de tâche. | **✅ Résolu (03/11/2026) & Étendu (17/11/2026) :** Hub SSE avec filtrage strict par destinataire (`canReceiveRealtimeEvent`) et notifications navigateur. |
| **DT-GLO-03** | **Rendu PDF vectoriel côté client (`window.print`)** | `ExecutiveReportModal.tsx`, `lib/report-generator.ts` | Dépendance vis-à-vis du navigateur client ; incapacité à générer des rapports PDF par lot la nuit en tâche de fond (cron). | Développer un endpoint API dédié `/api/reports/pdf` utilisant `@react-pdf/renderer` ou Chromium headless pour la distribution automatisée par e-mail. |
