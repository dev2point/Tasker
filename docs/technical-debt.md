# Dette Technique & Registre de Sécurité — mfisca-tasks

**Projet :** `mfisca-tasks` (Plateforme de Gestion de Tâches & Revue Métier)  
**Date de révision :** 30 Octobre 2026  
**Auteur :** Audit Sécurité Applicative (AppSec Senior) & Équipe Ingénierie  
**Version du document :** 2.0 (Post-Remédiation)

---

## Executive Summary & Vision Globale

Ce document consigne l'ensemble des vulnérabilités de sécurité applicative, des écarts d'architecture et des dettes techniques du projet **mfisca-tasks**, ainsi que l'état d'avancement des résolutions.

L'application repose sur une pile technologique moderne (Next.js 16 App Router, React 19, Better Auth 1.7, Drizzle ORM avec PostgreSQL/Supabase, Google Gemini API). Suite aux corrections appliquées, les vulnérabilités critiques de contrôle d'accès (BOLA) et de contournement d'authentification ont été corrigées avec succès.

---

## 1. Registre des Vulnérabilités & État des Résolutions

| ID | Titre & Description | Sévérité | CVSS v3.1 | CWE / OWASP | Localisation Code | Statut | Résolution Appliquée |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **SEC-01** | **BOLA & Fuite globale de données via l'API Sync**<br>L'endpoint `POST /api/sync` renvoyait toutes les tâches de la base sans RBAC. | **CRITIQUE** | **9.1** | CWE-284 / CWE-639<br>OWASP API1:2023 | `/app/api/sync/route.ts` | **RÉSOLU** | Filtrage strict par utilisateur `where(or(eq(creatorId, user.id), eq(assigneeId, user.id)))` pour les non-admins, et protection contre l'écrasement de tâches d'autrui. |
| **SEC-02** | **Contournement d'authentification IA via `x-user-id`**<br>La route `/api/ai/assistant` acceptait un header arbitraire sans vérifier la session. | **CRITIQUE** | **9.1** | CWE-287 / CWE-306<br>OWASP A07:2021 | `/app/api/ai/assistant/route.ts`<br>`/components/AIAssistantModal.tsx` | **RÉSOLU** | Suppression du header `x-user-id` ; vérification obligatoire de la session cryptographique via `getAuthenticatedUser(req)`. |
| **SEC-03** | **Clé secrète de chiffrement des sessions en dur (Fallback)**<br>`BETTER_AUTH_SECRET` utilisait une clé publique par défaut. | **ÉLEVÉ** | **8.1** | CWE-798 / CWE-321<br>OWASP A02:2021 | `/lib/auth.ts` | **RÉSOLU** | Alerte de sécurité explicite en production si non injecté et remplacement du fallback trivial. |
| **SEC-04** | **Cookies de session insécurisés & CSRF**<br>Configuration avec `useSecureCookies: false`. | **ÉLEVÉ** | **7.5** | CWE-614 / CWE-352<br>OWASP A05:2021 | `/lib/auth.ts` | **RÉSOLU** | `useSecureCookies` conditionné dynamiquement à la présence d'HTTPS/production/Render avec partitionnement des cookies (`Partitioned; Secure; HttpOnly`). |
| **SEC-05** | **Manipulation non autorisée des dossiers de revue (BOLA)**<br>`PATCH /api/review/dossiers` modifiait n'importe quel dossier sans vérification. | **ÉLEVÉ** | **7.7** | CWE-862 / CWE-639<br>OWASP API1:2023 | `/app/api/review/dossiers/route.ts` | **RÉSOLU** | Vérification RBAC stricte : seuls les admins, managers, le maker du dossier, le checker ou les collègues du même département peuvent modifier un dossier. |
| **SEC-06** | **Origines autorisées CORS trop permissives**<br>Présence de tunnels Cloudflare temporaires dans les configurations dev. | **MOYEN** | **6.5** | CWE-942<br>OWASP A05:2021 | `next.config.ts`<br>`/lib/auth.ts` | **RÉSOLU** | Suppression des tunnels expirés des origines autorisées. |
| **SEC-07** | **Absence d'en-têtes HTTP de sécurité**<br>Manque de CSP, HSTS, X-Content-Type-Options. | **MOYEN** | **5.4** | CWE-693 / CWE-1021<br>OWASP A05:2021 | `next.config.ts` | **RÉSOLU** | Ajout des headers de sécurité `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. |
| **SEC-08** | **Absence de Rate Limiting sur les routes API**<br>Risque d'épuisement de quotas IA et d'attaques par force brute. | **MOYEN** | **5.3** | CWE-307 / CWE-770<br>OWASP API4:2023 | `/lib/rate-limit.ts`<br>`/app/api/ai/assistant/route.ts`<br>`/app/api/sync/route.ts` | **RÉSOLU** | Création d'un module sliding-window `checkRateLimit` (20 req/min sur l'IA, 60 req/min sur la synchronisation). |
| **SEC-09** | **Exigence faible sur la longueur des mots de passe**<br>Longueur minimale configurée à 6 caractères. | **MOYEN** | **5.3** | CWE-521<br>OWASP A07:2021 | `/lib/auth.ts`<br>`/components/AuthModal.tsx` | **RÉSOLU** | Longueur minimale rehaussée à 12 caractères côté serveur (Better Auth) et validation dynamique côté client. |
| **SEC-10** | **Dépendances NPM présentant des avis de sécurité**<br>Présence d'alertes secondaires dans `sharp`, `vitest`, `zod`. | **FAIBLE** | **4.8** | CWE-1395 / CWE-1321<br>OWASP A06:2021 | `package.json` | **Suivi en CI** | Suivi régulier des patchs amonts et intégration dans la routine CI. |

---

## 2. Dette Technique d'Architecture & Qualité de Code

### A. Persistance vs Remplacement en Mémoire / Fallback JSON
* **Problème :** En l'absence de variable `DATABASE_URL` active, l'application utilise un système de repli local basé sur un fichier JSON (`data/auth_fallback.json` dans `/lib/auth.ts`) et des tableaux en mémoire (`runtimeDossiers` dans `/app/api/review/dossiers/route.ts`).
* **Impact :** En environnement multi-instances ou lors du redémarrage du conteneur Render (plan gratuit), les données de revue et les sessions locales sont réinitialisées ou désynchronisées.
* **Recommandation :** Rendre la connexion PostgreSQL/Drizzle obligatoire en production et désactiver le fallback fichier local hors mode de développement.

### B. Double Modélisation des Utilisateurs (`users` vs `user`)
* **Problème :** Le schéma de base de données (`src/db/schema.ts`) contient deux tables distinctes : `users` (table personnalisée du cabinet pour les rôles et départements) et `user` (table gérée par Better Auth).
* **Impact :** Nécessite des opérations de synchronisation et d'UPSERT systématiques lors des appels d'API (`/app/api/tasks/route.ts`, `/app/api/users/route.ts`), augmentant la complexité du code et le risque d'incohérence d'IDs.
* **Recommandation :** Unifier les tables en étendant directement le schéma Better Auth via l'adaptateur Drizzle.

### C. Gestion du Mode Hors-Ligne (PWA / IndexedDB)
* **Problème :** Le stockage local IndexedDB synchronise les tâches avec l'API lorsqu'une connexion est rétablie (`POST /api/sync`).
* **Résolu côté sécurité :** La synchronisation empêche désormais tout écrasement non autorisé de tâches appartenant à un autre collaborateur grâce au contrôle RBAC implémenté.

---

## 3. Feuille de Route de Remédiation & Avancement

- [x] **Phase 1 : Sécurisation API & Authentification** (SEC-01, SEC-02, SEC-03)
- [x] **Phase 2 : Durcissement Infrastructure & Sessions** (SEC-04, SEC-05, SEC-06, SEC-07, SEC-09)
- [x] **Phase 3 : Rate Limiting & Validation continue** (SEC-08, tests unitaires dans `tests/rbac-permissions.test.ts`)
