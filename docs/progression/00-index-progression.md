---
Jour: Lundi 2 Novembre 2026 (2026-11-02)
Heure de la dernière modif: 00:52:00 PST (08:52:00 UTC)
Auteur: niceboy
Module: Index Général & Cartographie de Progression
---

# 📑 Dossier de Progression & Documentation Technique — mfisca-tasks

Bienvenue dans le référentiel central de suivi, de documentation architecturale et d'évolution des modules du projet **mfisca-tasks**. 

Ce dossier consigne l'historique de conception, l'état d'avancement réel, les composants clés, les flux de données et le registre exhaustif des dettes techniques associées à chaque brique fonctionnelle du système.

---

## 🧭 Sommaire du Dossier de Progression

| N° | Fichier / Document | Domaine Fonctionnel & Technique | Statut Général | Niveau de Dette |
| :---: | :--- | :--- | :---: | :---: |
| **00** | [`00-index-progression.md`](./00-index-progression.md) | Synthèse générale, métriques globales & matrice de maturité | **À Jour** | Faible |
| **01** | [`01-gestion-taches-et-vues.md`](./01-gestion-taches-et-vues.md) | Modèle de tâche, Kanban, Listes, Calendrier, Filtrage & Priorités | **Opérationnel** | Faible / Modérée |
| **02** | [`02-circuit-revue-maker-checker.md`](./02-circuit-revue-maker-checker.md) | Workflow collaboratif Maker-Checker, Dossiers, Studio de révision & Passerelle | **Opérationnel** | Modérée |
| **03** | [`03-moteur-rapports-et-synthese-pdf.md`](./03-moteur-rapports-et-synthese-pdf.md) | Moteur de reporting exécutif, génération PDF A4, métriques fiscales & exports | **Opérationnel** | Modérée |
| **04** | [`04-metriques-kpis-et-benchmark.md`](./04-metriques-kpis-et-benchmark.md) | Statistiques temps réel, moteur de benchmark sectoriel, calculs de productivité | **Opérationnel** | Faible |
| **05** | [`05-persistance-bdd-et-synchronisation.md`](./05-persistance-bdd-et-synchronisation.md) | Architecture hybride PostgreSQL/Drizzle, API Sync, IndexedDB & Healthcheck | **Opérationnel** | Modérée |
| **06** | [`06-securite-rbac-et-audit-trail.md`](./06-securite-rbac-et-audit-trail.md) | Sécurité OWASP, RBAC multi-rôles, Better Auth, Rate Limiting & Traçabilité | **Durci & Validé** | Faible |
| **07** | [`07-integrations-pwa-et-m365.md`](./07-integrations-pwa-et-m365.md) | PWA (mode hors-ligne, Service Worker), Microsoft 365 & formats iCalendar | **Opérationnel** | Modérée |

---

## 📊 Matrice de Maturité & Indicateurs Qualité

```
[Qualité & Tests]       ████████████████████  100% (85/85 tests Vitest passants)
[Sécurité & RBAC]       ████████████████████  100% (Vulnérabilités SEC-01 à SEC-09 corrigées)
[Vues & Ergonomie]      ██████████████████░░   90% (Kanban, Calendrier, Liste, Rapport Exécutif)
[Moteur de Revue]       ██████████████████░░   90% (Maker-Checker, Studio Diff, Inter-départements)
[Persistance Hybride]   ████████████████░░░░   85% (PostgreSQL + Synchronisation locale résiliente)
[Intégrations Tiers]    ██████████████░░░░░░   75% (M365, iCal, PWA)
```

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
| **DT-GLO-02** | **Synchronisation temps réel par polling vs WebSockets** | `presence-service.ts`, `CollaborativeReviewPlatform.tsx` | Latence de mise à jour des présences (10-30s) et requêtes HTTP récurrentes superflues sur le serveur. | Évolution vers Server-Sent Events (SSE) ou WebSocket léger pour les événements de présence et de notification de revue. |
| **DT-GLO-03** | **Rendu PDF vectoriel côté client (`window.print`)** | `ExecutiveReportModal.tsx`, `lib/report-generator.ts` | Dépendance vis-à-vis du navigateur client ; incapacité à générer des rapports PDF par lot la nuit en tâche de fond (cron). | Développer un endpoint API dédié `/api/reports/pdf` utilisant `@react-pdf/renderer` ou Chromium headless pour la distribution automatisée par e-mail. |
