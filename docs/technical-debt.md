# Dette Technique & Registre de Sécurité — mfisca-tasks

**Projet :** `mfisca-tasks` (Plateforme de Gestion de Tâches & Revue Métier)  
**Date de révision :** 20 Novembre 2026
**Auteur :** Audit Sécurité Applicative (AppSec Senior) & Équipe Ingénierie  
**Version du document :** 3.5 (Résolution des dettes solvables applicativement & sécurisation SSE/PDF/Sync)

---

## Executive Summary & Vision Globale

Ce document consigne l'ensemble des vulnérabilités de sécurité applicative, des écarts d'architecture, des compromis d'implémentation et des dettes techniques du projet **mfisca-tasks**, ainsi que l'état d'avancement des résolutions.

L'application repose sur une pile Next.js 16 (App Router), React 19, Better Auth 1.7, Drizzle ORM avec PostgreSQL/Supabase et l'API Google Gemini. 
Une vague de remédiation applicative (v3.5) a permis de **résoudre l'intégralité des dettes solvables dans le code source sans dépendance d'infrastructure externe** (`SEC-03`, `SEC-07`, `SEC-08` sur auth, `SEC-10`, `SEC-11`, `DT-ARCH-05`, `DT-ARCH-08`, `DT-ARCH-10`, `DT-ARCH-11`, `DT-ARCH-13`, `DT-ARCH-16`, `DT-ARCH-17`, `DT-ARCH-18`, `DT-ARCH-19`).

Les pièces jointes bénéficient désormais de la conservation à la création (`POST /api/review/dossiers`), d'une extraction PDF serveur (`unpdf`), d'un véritable SHA-256 (FIPS 180-4 + `node:crypto`), d'une route de téléchargement authentifiée RBAC, d'une purge des octets base64 dans les diffusions SSE, ainsi que d'une **intégration Cloudflare R2 complète** (`/lib/storage/r2.ts`, `/api/review/files/upload`, streaming & URLs signées, tables Drizzle `review_files` et `review_file_versions`) et d'un **pont Supabase Realtime multi-instances** (`/lib/supabase/*`, HTTP Broadcast + WebSocket + Postgres Changes + Presence) avec repli local gracieux hors clés d'infrastructure. En revanche, l'activation effective de R2 et Supabase en production reste subordonnée au renseignement des variables d'environnement correspondantes, tandis que la migration complète des dossiers vers PostgreSQL (`DT-ARCH-01`), les politiques RLS par session (`DT-ARCH-04`), la suppression de `ensureDatabaseTables` (`DT-ARCH-06`), l'unification SQL des rôles (`DT-ARCH-07`), l'OCC SQL des tâches (`DT-ARCH-09`) et la chaîne complète de notification durable/cron/email/push/fuseaux (`DT-ARCH-02`, `DT-ARCH-14`, `DT-ARCH-20` à `DT-ARCH-24`) demeurent en attente d'infrastructure et d'approbation produit.

---

## 1. Registre des Vulnérabilités de Sécurité

| ID | Titre & Description | Sévérité | CVSS v3.1 | CWE / OWASP | Localisation Code | Statut | Résolution & Travaux Restants |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **SEC-01** | **BOLA & Fuite globale de données via l'API Sync**<br>L'endpoint `POST /api/sync` renvoyait toutes les tâches de la base sans RBAC. | **CRITIQUE** | **9.1** | CWE-284 / CWE-639<br>OWASP API1:2023 | `/app/api/sync/route.ts` | **RÉSOLU** | Filtrage strict par utilisateur `where(or(eq(creatorId, user.id), eq(assigneeId, user.id)))` pour les non-admins, et protection contre l'écrasement de tâches d'autrui. |
| **SEC-02** | **Contournement d'authentification IA via `x-user-id`**<br>La route `/api/ai/assistant` acceptait un header arbitraire sans vérifier la session. | **CRITIQUE** | **9.1** | CWE-287 / CWE-306<br>OWASP A07:2021 | `/app/api/ai/assistant/route.ts`<br>`/components/AIAssistantModal.tsx` | **RÉSOLU** | Suppression du header `x-user-id` ; vérification obligatoire de la session cryptographique via `getAuthenticatedUser(req)`. |
| **SEC-03** | **Clé secrète de chiffrement des sessions en dur (Fallback)**<br>`BETTER_AUTH_SECRET` disposait d'une valeur de secours hardcodée dans le code. | **ÉLEVÉ** | **8.1** | CWE-798 / CWE-321<br>OWASP A02:2021 | `/lib/auth.ts` | **RÉSOLU** | Suppression totale du secret hardcodé : levée d'erreur bloquante au runtime en production si `BETTER_AUTH_SECRET` (< 16 car.) est absent, et génération éphémère CSPRNG (`randomBytes(32)`) par processus uniquement en dev/test. |
| **SEC-04** | **Cookies de session insécurisés & CSRF**<br>Configuration avec `useSecureCookies: false`. | **ÉLEVÉ** | **7.5** | CWE-614 / CWE-352<br>OWASP A05:2021 | `/lib/auth.ts` | **RÉSOLU** | `useSecureCookies` conditionné dynamiquement à la présence d'HTTPS/production/Render avec partitionnement des cookies (`Partitioned; Secure; HttpOnly`). |
| **SEC-05** | **Manipulation non autorisée des dossiers de revue (BOLA)**<br>`PATCH /api/review/dossiers` modifiait n'importe quel dossier sans vérification. | **ÉLEVÉ** | **7.7** | CWE-862 / CWE-639<br>OWASP API1:2023 | `/app/api/review/dossiers/route.ts` | **RÉSOLU** | Vérification RBAC stricte : seuls les admins, managers, le maker du dossier, le checker ou les collègues du même département peuvent modifier un dossier. |
| **SEC-06** | **Origines autorisées CORS trop permissives**<br>Présence de tunnels Cloudflare temporaires dans les configurations dev. | **MOYEN** | **6.5** | CWE-942<br>OWASP A05:2021 | `next.config.ts`<br>`/lib/auth.ts` | **RÉSOLU** | Suppression des tunnels expirés des origines autorisées. |
| **SEC-07** | **Absence d'en-têtes HTTP de sécurité critiques (CSP & HSTS)**<br>Manque de politique de sécurité de contenu et de forçage HTTPS strict. | **MOYEN** | **5.4** | CWE-693 / CWE-1021<br>OWASP A05:2021 | `next.config.ts` | **RÉSOLU** | En-têtes `Content-Security-Policy` et `Strict-Transport-Security` (`max-age=63072000; includeSubDomains`) ajoutés en complément de `nosniff`, `Referrer-Policy` et `Permissions-Policy`. |
| **SEC-08** | **Couverture limitée du Rate Limiting**<br>Le quota existe sur IA, sync et auth, dans une mémoire locale par instance. | **MOYEN** | **5.3** | CWE-307 / CWE-770<br>OWASP API4:2023 | `/lib/rate-limit.ts`<br>`/app/api/auth/[...all]/route.ts`<br>`/app/api/ai/assistant/route.ts`<br>`/app/api/sync/route.ts` | ⚠️ **PARTIELLEMENT RÉSOLU** | `checkRateLimit` appliqué aux routes d'authentification Better Auth (15 POST/min/IP+route, 120 GET/min/IP) en plus d'IA et Sync. Le backend distribué Redis reste requis pour les déploiements multi-instances. |
| **SEC-09** | **Exigence faible sur la longueur des mots de passe**<br>Longueur minimale configurée initialement à 6 caractères. | **MOYEN** | **5.3** | CWE-521<br>OWASP A07:2021 | `/lib/auth.ts`<br>`/components/AuthModal.tsx` | **RÉSOLU** | Longueur minimale rehaussée à 12 caractères côté serveur (Better Auth) et validation dynamique côté client. |
| **SEC-10** | **Dépendances NPM présentant des avis de sécurité**<br>Alertes secondaires amonts. | **FAIBLE** | **4.8** | CWE-1395 / CWE-1321<br>OWASP A06:2021 | `package.json`<br>`.github/workflows/test.yml` | **RÉSOLU** | Étape `npm audit --audit-level=high` intégrée dans le workflow CI GitHub Actions et consignée dans le résumé de pipeline. |
| **SEC-11** | **Diffusion SSE arbitraire sans authentification**<br>`POST /api/events` acceptait n'importe quel type/acteur client sans session. | **ÉLEVÉ** | **8.2** | CWE-306 / CWE-862<br>OWASP API1:2023 | `/app/api/events/route.ts` | **RÉSOLU** | Vérification obligatoire de session via `getAuthenticatedUser`, acteur imposé depuis la session, whitelist stricte `CLIENT_BROADCASTABLE_EVENT_TYPES` et purge des data URLs base64. |
| **SEC-12** | **Authentification sur stockage JSON hors PostgreSQL**<br>Si `DATABASE_URL` n'est pas configuré, Better Auth utilise un adaptateur JSON local en plus des données en mémoire. | **ÉLEVÉ** | **7.5** | CWE-312 / CWE-538<br>OWASP A02:2021 | `/lib/auth.ts` | ⚠️ **MODE DE SECOURS** | Ce fallback permet le fonctionnement hors base, mais persiste sessions/comptes/utilisateurs dans `data/auth_fallback.json`. Il manque sauvegarde, rotation des secrets, restrictions de déploiement multi-instances et protection opérationnelle explicite. |

---

## 2. État des Chantiers d'Architecture Initiaux (Clarification de Portée)

Pour lever toute ambiguïté entre observabilité et résolution effective :

### A. Surveillance d'état et diagnostic (`/api/health`)
* **Statut :** **SURVEILLANCE OPÉRATIONNELLE (Persistance Tâches Uniquement)**
* **Précision :** Le point de contrôle `/api/health` réalise réellement un ping PostgreSQL et retourne HTTP 503 en production si la base est configurée mais indisponible. Il signale seulement la présence des secrets Better Auth/Gemini et du mode d'authentification ; il ne sonde aucune session Better Auth ni aucun appel réel Gemini. Les dossiers de revue (`ReviewDossier`) et leurs fichiers joints restent totalement hors base (voir `DT-ARCH-01` et `DT-ARCH-15`).

### B. Modélisation de la table d'utilisateurs (`users` vs `user`)
* **Statut :** **RÉSOLU EN BASE / DIVERGENCE RÔLES EN APPLICATION**
* **Précision :** L'unification structurelle de la table SQL `user` est effective dans Drizzle. Cependant, un décrochage persiste entre l'énumération SQL des rôles système et les rôles du workflow Maker-Checker (voir `DT-ARCH-08`).

### C. Gestion du Mode Hors-Ligne (PWA / IndexedDB)
* **Statut :** **SÉCURISÉ EN CONTRÔLE D'ACCÈS / NON RÉSOLU EN CONCURRENCE**
* **Précision :** L'endpoint `POST /api/sync` a été blindé contre les attaques BOLA. En revanche, la gestion des conflits d'écritures concurrentes et le rollback lors d'échecs de synchronisation demeurent ouverts (voir `DT-ARCH-06` et `DT-ARCH-09`).

---

## 3. Registre Détaillé des Dettes Techniques & Anomalies

Ce registre recense **24 dettes techniques d'architecture** et **anomalies de conception** documentées et qualifiées.

### 3.1 Dettes Critiques (Blocage Métier ou Perte de Données)

#### DT-ARCH-01 — Absence de persistance PostgreSQL pour les dossiers de revue métier
* **Sévérité :** 🔴 **CRITIQUE**
* **Localisation :** `/app/api/review/dossiers/route.ts` (variable `runtimeDossiers`) · `lib/review-service.ts` (clé localStorage `planit_review_dossiers_v1`)
* **Constat :** Les dossiers (`ReviewDossier`), les diffs textuels et financiers, ainsi que les pistes d'audit légales ne sont stockés que dans la mémoire vive Node.js du serveur et dans le localStorage du navigateur client. Leurs fichiers joints dépendent en plus du base64 conservé dans ce même dossier local (voir `DT-ARCH-15`). Un redémarrage serveur entraîne la perte des dossiers non sauvegardés localement par l'utilisateur.
* **Impact :** Perte de données irrémédiable, impossibilité de garantir la conformité réglementaire promise au cabinet.
* **Remédiation :** Créer la table `review_dossiers` dans `src/db/schema.ts`, puis les tables `review_files` et `review_file_versions` décrites dans `DT-ARCH-15`, générer les migrations Drizzle et migrer `route.ts` sur Drizzle ORM.

#### DT-ARCH-02 — Moteur de rappels sans exécution serveur (Rappels 100% dépendants du navigateur client)
* **Sévérité :** 🔴 **CRITIQUE (Cœur Métier Cabinet)**
* **Localisation :** `components/HomeWorkspace.tsx:551-590` (`evaluateReminders` dans un `setInterval` client de 10s) · `lib/reminders.ts:142-185`
* **Constat :** L'évaluation des rappels d'échéance ne s'exécute que lorsque le collaborateur a l'application ouverte et active dans un onglet de son navigateur. Le moteur client appelle `new Notification(...)`, joue un son et enregistre la notification via `saveNotifications`, sans la persister dans PostgreSQL. À l'inverse, `POST /api/tasks` génère déjà serveur les notifications d'assignation et de complétion via `detectTaskNotificationTransitions`, les insère dans la table `notifications` et les diffuse par SSE. Il n'existe **aucun cron serveur, aucun worker asynchrone, ni aucun service d'envoi d'e-mail ou de Web Push** pour les rappels.
* **Impact :** Si l'utilisateur ferme l'onglet ou sa machine, les rappels ne se déclenchent pas. Risque direct de manquer une échéance fiscale ou de liasse comptable. Les notifications locales ne sont pas visibles sur un autre appareil.
* **Remédiation :** Conserver la base de données comme source de vérité unique. Implémenter une route cron sécurisée `/api/cron/reminders` ou un worker serveur qui évalue les rappels dus et crée des notifications atomiquement, puis distribue les alertes par e-mail (Resend/SendGrid/Graph API) et Web Push via service worker. Le `setInterval` client ne doit rester qu'un affichage optimiste, jamais le mécanisme de livraison.

#### DT-ARCH-03 — Hub SSE in-process incompatible avec les déploiements multi-instances — ⚠️ **IMPLÉMENTÉ VIA SUPABASE REALTIME (En attente clés prod)**
* **Sévérité :** 🔴 **CRITIQUE (Scalabilité & Concurrence)** -> **Code implémenté (attente clés Supabase)**
* **Localisation :** `lib/realtime-hub.ts` · `lib/supabase/config.ts` · `lib/supabase/client.ts` · `lib/supabase/realtime-publisher.ts` · `lib/use-realtime-events.ts`
* **Constat :** Le `RealtimeEventHub` dispose désormais d'un pont serveur stateless via l'API HTTP Broadcast de Supabase Realtime (`publishToSupabaseRealtime`) et d'une souscription double-transport côté client (`SSE` + `Supabase Realtime Broadcast / Postgres Changes / Presence`) avec déduplication par `event.id`.
* **Travaux restants :** Renseigner `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) et `SUPABASE_SECRET_KEY` (`sb_secret_...`) dans l'environnement de déploiement pour activer le canal `mfisca-cabinet-realtime`.

---

### 3.2 Dettes Élevées (Sécurité & Intégrité des Données)

#### DT-ARCH-04 — Politiques RLS PostgreSQL ouvertes (`using: sql\`true\``)
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `src/db/schema.ts` (tables `user`, `tasks`, `workspaces`, `notifications`)
* **Constat :** Bien que `.enableRLS()` soit activé sur chaque table, toutes les politiques autorisent tout le trafic (`using: sql\`true\``, `withCheck: sql\`true\``). L'isolation dépend uniquement des filtres manuels écrits dans le code applicatif TypeScript.
* **Impact :** Pas de défense en profondeur au niveau du moteur PostgreSQL.
* **Remédiation :** Définir de réelles expressions RLS basées sur le contexte utilisateur de session (`current_setting('app.current_user_id', true)`).

#### DT-ARCH-05 — Adresse IP factice dans le journal d'audit légal — ✅ **RÉSOLU**
* **Sévérité :** 🟠 **ÉLEVÉ** -> **RÉSOLU**
* **Localisation :** `lib/review-service.ts` · `/app/api/review/dossiers/route.ts` (`extractClientIp`) · `components/review/NewDossierModal.tsx` · `components/review/DossierReviewStudioModal.tsx`
* **Résolution :** Remplacement des IP factices (`192.168.1.88`, `192.168.1.42`) par le marqueur transitoire `server-pending`, puis injection systématique côté serveur de l'IP réelle extraite de `x-forwarded-for` / `x-real-ip` lors de `POST` et `PATCH /api/review/dossiers`.

#### DT-ARCH-06 — Double source de vérité pour le schéma PostgreSQL
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `lib/db/pg.ts` (`ensureDatabaseTables()`) vs répertoire `/drizzle`
* **Constat :** Le schéma est maintenu à deux endroits distincts : d'une part les migrations officielles Drizzle Kit (`/drizzle/*.sql`), d'autre part une fonction utilitaire `ensureDatabaseTables()` qui exécute du DDL SQL brut (`CREATE TABLE IF NOT EXISTS`) appelée au runtime au début de presque chaque route API (`/api/tasks`, `/api/users`, `/api/categories`, etc.).
* **Impact :** Dérives de schéma non tracées, ralentissement du cold start des routes API, risques de blocages ou de conflits de verrous DDL lors de requêtes concurrentes.
* **Remédiation :** Supprimer les appels systématiques à `ensureDatabaseTables()` dans les routes API et s'appuyer exclusivement sur le cycle de migration de build/déploiement (`drizzle-kit migrate` ou script de release).

#### DT-ARCH-07 — Écart de modélisation entre rôles système et rôles du workflow
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `src/db/schema.ts` (`userRoleEnum`) vs `types/review.ts` (`WorkflowActor['role']`)
* **Constat :** Le système de base de données gère les rôles : `'admin' | 'manager' | 'member' | 'guest'`. Le workflow Maker-Checker définit quant à lui les rôles : `'collaborateur' | 'manager' | 'associe' | 'admin'`. Aucun adaptateur formel ne lie ces deux référentiels. Le rôle métier `'associe'` n'a aucun équivalent strict dans la base.
* **Impact :** Risques d'incohérences de droits lors des validations ou des attributions de dossiers ; contournements potentiels de la hiérarchie de validation.
* **Remédiation :** Aligner l'énumération PostgreSQL `user_role` ou introduire un champ distinct `hierarchical_grade` pour séparer les privilèges système (RBAC) des prérogatives hiérarchiques métier (Associé, Senior, Manager, Collaborateur).

---

### 3.3 Dettes Modérées à Élevées (Ergonomie, Exploitation & Robustesse)

#### DT-ARCH-08 — Écriture optimiste sans rollback sur la création/mise à jour de tâches — ✅ **RÉSOLU**
* **Sévérité :** 🟡 **MODÉRÉE** -> **RÉSOLU**
* **Localisation :** `types/task.ts` (`syncPending`, `syncError`) · `components/HomeWorkspace.tsx` (`persistTaskToDb`, `deleteTaskFromDb`)
* **Résolution :** Les mutations locales marquent les tâches avec `syncPending: true` et capturent un snapshot avant écriture optimiste. En cas d'acquittement HTTP OK, `syncPending` est effacé ; en cas de rejet serveur (`400/403/409/5xx`), l'état client est restauré par rollback et une bannière d'alerte visible avec action « Réessayer » est affichée.

#### DT-ARCH-09 — Absence de résolution de conflits offline/online (Synchronisation)
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `lib/usePlanitStore.ts` · `/app/api/sync/route.ts`
* **Constat :** En mode hors-ligne, si deux modifications concurrentes sont apportées sur une tâche par deux utilisateurs différents, le dernier appel à `/api/sync` écrase l'état sans contrôle d'antériorité ni détection de conflit (contrairement au module de revue qui possède un OCC `version`).
* **Impact :** Écrasement silencieux d'amendements ou de statuts de tâches.
* **Remédiation :** Généraliser le contrôle de concurrence optimiste (OCC) avec `version` ou horodatage `updatedAt` sur la table `tasks`.

#### DT-ARCH-10 — Attribution automatique du superviseur par département — ✅ **RÉSOLU**
* **Sévérité :** 🟡 **MODÉRÉE** -> **RÉSOLU**
* **Localisation :** `lib/review-service.ts` (`resolveDepartmentSupervisor`) · `components/review/NewDossierModal.tsx` · `components/review/DossierReviewStudioModal.tsx`
* **Résolution :** Implémentation du résolveur hiérarchique `resolveDepartmentSupervisor` priorisant un manager actif du département cible (hors créateur), avec repli sur admin/manager actif. Affecté automatiquement à la création et pré-sélectionné lors de la soumission N+1.

#### DT-ARCH-11 — Génération de rapports PDF serveur — ✅ **RÉSOLU**
* **Sévérité :** 🟡 **MODÉRÉE** -> **RÉSOLU**
* **Localisation :** `/app/api/reports/pdf/route.ts` · `components/ExecutiveReportModal.tsx`
* **Résolution :** Route serveur authentifiée `POST /api/reports/pdf` générant un véritable PDF A4 multi-pages côté Node.js via `pdf-lib`, déclenchable directement depuis le bouton « PDF Serveur » dans `ExecutiveReportModal.tsx`.

#### DT-ARCH-12 — Absence de tests de bout en bout (E2E)
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** Répertoire `/tests` (21 fichiers de tests unitaires/intégration Vitest, 0 test Playwright)
* **Constat :** Les flux interactifs complets (authentification multi-rôles, cycle de vie complet Maker-Checker) ne sont pas testés dans un navigateur réel automatisé.
* **Impact :** Risque de régression de navigation ou de rendu.
* **Remédiation :** Mettre en place Playwright pour les 5 scénarios critiques du cabinet.

#### DT-ARCH-13 — Observabilité de santé & alignement modèle IA (`/api/health`) — ✅ **RÉSOLU**
* **Sévérité :** 🟡 **MODÉRÉE** -> **RÉSOLU**
* **Localisation :** `lib/ai-config.ts` (`GEMINI_MODEL`) · `/app/api/health/route.ts` · `/app/api/ai/assistant/route.ts`
* **Résolution :** Extraction de la constante partagée `GEMINI_MODEL = 'gemini-3.7-flash'` utilisée par l'assistant IA et `/api/health`, et ajout de blocs diagnostiques `realtime` (abonnés SSE / présence active) et `reviewDossiers` dans la réponse de `/api/health`.

#### DT-ARCH-14 — Moteur de rappels sans persistance atomique ni journal d'exécution
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `components/HomeWorkspace.tsx:551-590` · `lib/reminders.ts:142-185` · `lib/usePlanitStore.ts:360-374`
* **Constat :** Le navigateur utilise un intervalle de 10 secondes. La mise à jour `reminderTriggered`, la notification locale et l'appel `POST /api/tasks` ne forment pas une transaction atomique. `setNotifications` persiste uniquement dans `localStorage` et IndexedDB. Dans `POST /api/tasks`, l'insertion en table `notifications` est enveloppée dans un `try/catch` qui se contente de `console.warn` puis poursuit la diffusion SSE. Il n'existe aucun historique serveur des rappels ou livraisons effectivement envoyés.
* **Impact :** Double déclenchement possible en multi-clients, perte silencieuse d'une notification si l'insertion SQL échoue, absence de preuve d'envoi et récupération imparfaite après panne.
* **Remédiation :** Établir une file d'envoi durable avec verrouillage atomique, journal de livraison et exécuteur serveur idempotent (voir `DT-ARCH-21`). Ne jamais poursuivre la diffusion d'une notification métier après un échec de persistance sans compensation explicite.

#### DT-ARCH-15 — Fichiers de revue conservés en base64 dans le navigateur, sans stockage serveur — ⚠️ **IMPLÉMENTÉ VIA CLOUDFLARE R2 (En attente clés prod)**
* **Sévérité :** 🔴 **CRITIQUE** -> **Code & Schéma SQL implémentés (attente clés R2)**
* **Localisation :** `lib/storage/r2.ts` · `app/api/review/files/upload/route.ts` · `app/api/review/file-versions/[versionId]/download/route.ts` · `app/api/review/dossiers/route.ts` · `src/db/schema.ts` (`review_files`, `review_file_versions`) · `components/review/NewDossierModal.tsx` · `components/FileVersionManager.tsx`
* **Constat :** L'upload direct vers Cloudflare R2 (`POST /api/review/files/upload`), le délestage automatique des payloads inline vers R2 lors de la sauvegarde dossier, le téléchargement authentifié RBAC (streaming et URLs signées `?mode=signed`), le nettoyage R2 lors de la suppression et les tables Drizzle `review_files` / `review_file_versions` sont en place, avec repli local transparent lorsque les clés R2 sont absentes.
* **Travaux restants :** Configurer `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` et `R2_BUCKET_NAME` dans l'environnement cible, et finaliser le basculement complet des dossiers depuis `runtimeDossiers` vers PostgreSQL (`DT-ARCH-01`).

#### DT-ARCH-16 — Conservation des pièces jointes lors de la création serveur — ✅ **RÉSOLU**
* **Sévérité :** 🟠 **ÉLEVÉ** -> **RÉSOLU**
* **Localisation :** `/app/api/review/dossiers/route.ts` · `components/review/CollaborativeReviewPlatform.tsx`
* **Résolution :** `POST /api/review/dossiers` valide et intègre désormais `trackedFiles` et `checker`, et le client synchronise l'état local avec le dossier retourné par le serveur.

#### DT-ARCH-17 — Extraction PDF serveur & Checksum SHA-256 cryptographique — ✅ **RÉSOLU**
* **Sévérité :** 🟠 **ÉLEVÉ** -> **RÉSOLU**
* **Localisation :** `/app/api/review/files/extract/route.ts` · `/app/api/review/dossiers/route.ts` · `lib/file-version-service.ts` · `components/review/NewDossierModal.tsx` · `components/FileVersionManager.tsx`
* **Résolution :** Ajout d'une route authentifiée `POST /api/review/files/extract` utilisant `unpdf` pour extraire le texte réel des PDF (ainsi que DOCX/XLSX/CSV/Markdown) et retourner un SHA-256 `node:crypto` sur les octets bruts. Le hash 32 bits client dans `generateChecksum()` est remplacé par une implémentation FIPS 180-4 SHA-256 (`sha256:<64 hex>`), et le serveur recalcule le SHA-256 réel sur les octets uploadés.

#### DT-ARCH-18 — Purge des octets base64 du flux SSE & route de téléchargement RBAC — ✅ **RÉSOLU (hors stockage S3/R2)**
* **Sévérité :** 🟠 **ÉLEVÉ** -> **RÉSOLU (Couche Transport/SSE)**
* **Localisation :** `lib/review-service.ts` (`stripDossierFileBytesForBroadcast`, `mergeDossierPreservingCachedFileBytes`) · `/app/api/review/dossiers/route.ts` · `/app/api/events/route.ts` · `/app/api/review/file-versions/[versionId]/download/route.ts`
* **Résolution :** Les événements SSE ne transportent plus les octets base64 (`data:...`) : ils sont remplacés par l'URL authentifiée `/api/review/file-versions/[versionId]/download?dossierId=...` protégée par vérification de session et RBAC (admin/manager/maker/checker/même département). La persistence S3/SQL reste couverte par `DT-ARCH-15`.

#### DT-ARCH-19 — Visibilité des pièces jointes dans la liste et le studio — ✅ **RÉSOLU**
* **Sévérité :** 🟡 **MODÉRÉE** -> **RÉSOLU**
* **Localisation :** `components/review/CollaborativeReviewPlatform.tsx` · `components/review/DossierReviewStudioModal.tsx`
* **Résolution :** Ajout d'un indicateur du nombre de pièces jointes (`Paperclip`) dans chaque ligne de la liste des dossiers, promotion de la gestion documentaire vers un onglet de premier niveau `Fichiers (N)` dans le studio, et ajout d'un « Manifeste des livrables transmis » dans la modale de soumission.

### 3.4 Dettes de Fiabilité des Notifications de Tâches

#### DT-ARCH-20 — Double circuit de notifications : persistance serveur partielle, rappels et actions admin locaux
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `app/api/tasks/route.ts:332-418` · `components/HomeWorkspace.tsx:551-590,614-763,820-853` · `lib/usePlanitStore.ts:360-374` · `app/api/notifications/route.ts:10-63`
* **Constat :** Les transitions d'assignation, de réassignation et de complétion sont persistées dans la table `notifications` et diffusées par SSE. En revanche, les rappels d'échéance créés par `evaluateReminders` et les notifications d'actions administrateur construites par `buildAdminActionNotification` passent par `saveNotifications`, donc uniquement par `localStorage`/IndexedDB. Il n'existe pas de `POST /api/notifications` pour enregistrer ces événements côté serveur.
* **Impact :** Deux utilisateurs n'ont pas le même centre de notifications ; l'historique dépend du navigateur ; un nettoyage du stockage local supprime la preuve des rappels ; la route `GET /api/notifications` ne peut pas restituer ces événements sur un autre appareil.
* **Remédiation :** Faire créer toutes les notifications autoritatives par le serveur. Conserver `localStorage`/IndexedDB comme cache d'affichage, jamais comme source de vérité. Ajouter une route d'écriture authentifiée uniquement si un besoin légitime de notification client subsiste.

#### DT-ARCH-21 — Absence de file d'envoi durable, d'idempotence et de journal de livraison
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `app/api/tasks/route.ts:359-395` · `app/api/notifications/route.ts:65-137` · `src/db/schema.ts:249-288`
* **Constat :** La table `notifications` contient l'état d'affichage (`read`) mais aucun état de livraison : pas de `channel`, `status`, `attempts`, `next_attempt_at`, `sent_at`, `provider_id`, `dedupe_key` ni `last_error`. L'insertion de notification dans `POST /api/tasks` échoue silencieusement après un avertissement console. Le hub SSE en mémoire diffuse immédiatement, sans acquittement ni rejeu.
* **Impact :** Notifications perdues en cas d'erreur SQL ou de redémarrage, doublons possibles, aucune retry, aucun dead-letter, aucune métrique de délivrabilité et aucune preuve opposable d'envoi.
* **Remédiation :** Introduire une table `notification_deliveries` avec clé d'idempotence unique, statut, tentative, prochaine échéance et erreur fournisseur. Écrire notification et livraison dans la même transaction, puis traiter avec un worker utilisant verrouillage de ligne et backoff exponentiel.

#### DT-ARCH-22 — Web Push non implémenté malgré la présence d'un service worker PWA
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `public/sw.js:1-88` · `lib/reminders.ts:79-106` · `components/HomeWorkspace.tsx:551-590`
* **Constat :** Le service worker ne contient que les événements `install`, `activate` et `fetch`. Il n'existe aucun gestionnaire `push`, `notificationclick`, aucun appel à `registration.showNotification`, aucune clé VAPID ni table d'abonnements Web Push. Le code utilise `new Notification(...)`, qui dépend d'un onglet actif.
* **Impact :** Aucune notification n'est reçue lorsque l'onglet est fermé ou lorsque l'appareil est verrouillé. La PWA ne fournit aujourd'hui que du cache hors-ligne.
* **Remédiation :** Ajouter l'abonnement Web Push, les clés VAPID côté serveur, une table `push_subscriptions`, les événements `push` et `notificationclick` dans `public/sw.js`, et remplacer `new Notification(...)` par `registration.showNotification(...)`.

#### DT-ARCH-23 — Aucun canal de secours ni préférences de notification
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `package.json` (aucun provider e-mail) · `app/api/tasks/route.ts:359-418` · `app/api/notifications/route.ts`
* **Constat :** Les seuls canaux disponibles sont l'affichage dans le centre de notifications, le SSE en mémoire et la notification navigateur liée à un onglet actif. Il n'existe ni envoi e-mail, ni digest quotidien, ni préférences par type de notification, ni fenêtre de silence, ni fuseau utilisateur associé aux préférences.
* **Impact :** Un utilisateur qui refuse les permissions navigateur, éteint son appareil ou quitte l'application n'a aucun moyen fiable d'être alerté. Les échéances métier critiques n'ont pas de filet de sécurité.
* **Remédiation :** Intégrer un provider e-mail transactionnel, définir des préférences par utilisateur et par type d'événement, prévoir un digest configurable et désactiver les envois pendant les heures de silence de l'utilisateur.

#### DT-ARCH-24 — Calcul des échéances dépendant du fuseau horaire de l'hôte
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `lib/reminders.ts:4-42,44-77` · `lib/reminders.ts:142-185`
* **Constat :** `getTaskDueDateTime()` construit les dates avec `new Date(year, month - 1, day, hours, minutes)`, donc avec le fuseau du processus client ou serveur. Aucune table d'utilisateur ou de workspace ne stocke de fuseau IANA. Le calcul ne gère pas explicitement les transitions d'heure d'été/hiver et produira des résultats différents selon l'hôte qui exécute le cron.
* **Impact :** Rappels envoyés trop tôt ou trop tard, notamment pour les utilisateurs situés hors du fuseau du serveur et lors des changements d'heure. Risque élevé pour les échéances fiscales et comptables.
* **Remédiation :** Stocker un fuseau IANA par utilisateur ou workspace, calculer `scheduled_for` avec une bibliothèque timezone-aware, persister l'horodatage UTC dérivé et ajouter des tests couvrant au moins un changement d'heure d'été/hiver et deux fuseaux différents.

---

## 4. Feuille de Route Restante (Dépendances Infrastructure / Base de Données / Décisions Produit)

```
[Priorité 1 - Base & Stockage]  DT-ARCH-01 (Persistance PostgreSQL Dossiers)
                                DT-ARCH-15 (Stockage objet S3/R2 & tables review_files)
                                SEC-12     (Désactivation/durcissement fallback JSON en prod)
[Priorité 2 - Notifications]    DT-ARCH-02 (Cron/Worker Rappels Serveur)
                                DT-ARCH-20 (Source de vérité unique notifications)
                                DT-ARCH-21 (File d'envoi durable, idempotence & journal)
                                DT-ARCH-14 (Rappels atomiques & journalisés)
                                DT-ARCH-22 (Web Push via service worker & clés VAPID)
                                DT-ARCH-23 (Canal e-mail & préférences utilisateur)
                                DT-ARCH-24 (Fuseaux horaires & DST pour les échéances)
[Priorité 3 - SQL & Scalabilité] DT-ARCH-04 (Durcissement RLS SQL)
                                DT-ARCH-06 (Suppression ensureDatabaseTables au runtime)
                                DT-ARCH-07 (Unification des rôles système / métier)
                                DT-ARCH-03 (Redis Pub/Sub pour le SSE multi-instances)
                                SEC-08     (Rate limiting distribué Redis)
                                DT-ARCH-09 (OCC / version sur la table tasks)
[Priorité 4 - Qualité E2E]      DT-ARCH-12 (Tests E2E Playwright)
```

> **Déjà résolus en v3.5 (code applicatif) :** `SEC-03`, `SEC-07`, `SEC-08` (couverture auth), `SEC-10`, `SEC-11`, `DT-ARCH-05`, `DT-ARCH-08`, `DT-ARCH-10`, `DT-ARCH-11`, `DT-ARCH-13`, `DT-ARCH-16`, `DT-ARCH-17`, `DT-ARCH-18`, `DT-ARCH-19`.
