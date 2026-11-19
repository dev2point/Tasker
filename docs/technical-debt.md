# Dette Technique & Registre de Sécurité — mfisca-tasks

**Projet :** `mfisca-tasks` (Plateforme de Gestion de Tâches & Revue Métier)  
**Date de révision :** 19 Novembre 2026  
**Auteur :** Audit Sécurité Applicative (AppSec Senior) & Équipe Ingénierie  
**Version du document :** 3.2 (Audit Exhaustif & Résorption des Incohérences)

---

## Executive Summary & Vision Globale

Ce document consigne l'ensemble des vulnérabilités de sécurité applicative, des écarts d'architecture, des compromis d'implémentation et des dettes techniques du projet **mfisca-tasks**, ainsi que l'état d'avancement des résolutions.

L'application repose sur une pile Next.js 16 (App Router), React 19, Better Auth 1.7, Drizzle ORM avec PostgreSQL/Supabase et l'API Google Gemini. 
Une analyse approfondie du code source a permis de réaligner le registre avec la réalité opérationnelle : **distinguer clairement ce qui est sécurisé de ce qui n'est pas encore persisté ou automatisé**, et lever les ambiguïtés entre les spécifications fonctionnelles (PRD/README) et l'implémentation réelle.

---

## 1. Registre des Vulnérabilités de Sécurité

| ID | Titre & Description | Sévérité | CVSS v3.1 | CWE / OWASP | Localisation Code | Statut | Résolution & Travaux Restants |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **SEC-01** | **BOLA & Fuite globale de données via l'API Sync**<br>L'endpoint `POST /api/sync` renvoyait toutes les tâches de la base sans RBAC. | **CRITIQUE** | **9.1** | CWE-284 / CWE-639<br>OWASP API1:2023 | `/app/api/sync/route.ts` | **RÉSOLU** | Filtrage strict par utilisateur `where(or(eq(creatorId, user.id), eq(assigneeId, user.id)))` pour les non-admins, et protection contre l'écrasement de tâches d'autrui. |
| **SEC-02** | **Contournement d'authentification IA via `x-user-id`**<br>La route `/api/ai/assistant` acceptait un header arbitraire sans vérifier la session. | **CRITIQUE** | **9.1** | CWE-287 / CWE-306<br>OWASP A07:2021 | `/app/api/ai/assistant/route.ts`<br>`/components/AIAssistantModal.tsx` | **RÉSOLU** | Suppression du header `x-user-id` ; vérification obligatoire de la session cryptographique via `getAuthenticatedUser(req)`. |
| **SEC-03** | **Clé secrète de chiffrement des sessions en dur (Fallback)**<br>`BETTER_AUTH_SECRET` dispose encore d'une valeur de secours hardcodée dans le code. | **ÉLEVÉ** | **8.1** | CWE-798 / CWE-321<br>OWASP A02:2021 | `/lib/auth.ts` | ⚠️ **PARTIELLEMENT RÉSOLU** | Alerte explicite en production lorsqu'elle est absente, mais la constante `mfisca_cabinet_secure_auth_secret_2026_salt_89fa2194` reste utilisée hors variable d'environnement. Le fallback doit être supprimé et remplacé par un arrêt sécurisé de l'authentification si le secret n'est pas configuré. |
| **SEC-04** | **Cookies de session insécurisés & CSRF**<br>Configuration avec `useSecureCookies: false`. | **ÉLEVÉ** | **7.5** | CWE-614 / CWE-352<br>OWASP A05:2021 | `/lib/auth.ts` | **RÉSOLU** | `useSecureCookies` conditionné dynamiquement à la présence d'HTTPS/production/Render avec partitionnement des cookies (`Partitioned; Secure; HttpOnly`). |
| **SEC-05** | **Manipulation non autorisée des dossiers de revue (BOLA)**<br>`PATCH /api/review/dossiers` modifiait n'importe quel dossier sans vérification. | **ÉLEVÉ** | **7.7** | CWE-862 / CWE-639<br>OWASP API1:2023 | `/app/api/review/dossiers/route.ts` | **RÉSOLU** | Vérification RBAC stricte : seuls les admins, managers, le maker du dossier, le checker ou les collègues du même département peuvent modifier un dossier. |
| **SEC-06** | **Origines autorisées CORS trop permissives**<br>Présence de tunnels Cloudflare temporaires dans les configurations dev. | **MOYEN** | **6.5** | CWE-942<br>OWASP A05:2021 | `next.config.ts`<br>`/lib/auth.ts` | **RÉSOLU** | Suppression des tunnels expirés des origines autorisées. |
| **SEC-07** | **Absence d'en-têtes HTTP de sécurité critiques (CSP & HSTS)**<br>Manque de politique de sécurité de contenu et de forçage HTTPS strict. | **MOYEN** | **5.4** | CWE-693 / CWE-1021<br>OWASP A05:2021 | `next.config.ts` | ⚠️ **PARTIELLEMENT RÉSOLU** | Les en-têtes `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy` et `Permissions-Policy` sont en place. **Sont toujours manquants :** `Content-Security-Policy` (CSP) et `Strict-Transport-Security` (HSTS). |
| **SEC-08** | **Couverture limitée du Rate Limiting**<br>Le quota existe seulement sur IA et synchronisation, dans une mémoire locale par instance. | **MOYEN** | **5.3** | CWE-307 / CWE-770<br>OWASP API4:2023 | `/lib/rate-limit.ts`<br>`/app/api/ai/assistant/route.ts`<br>`/app/api/sync/route.ts` | ⚠️ **PARTIELLEMENT RÉSOLU** | Limites sliding-window présentes (20 req/min IA, 60 req/min sync), mais le registre in-process n'est pas partagé entre instances. Aucun `checkRateLimit` n'est appliqué aux routes d'authentification. |
| **SEC-09** | **Exigence faible sur la longueur des mots de passe**<br>Longueur minimale configurée initialement à 6 caractères. | **MOYEN** | **5.3** | CWE-521<br>OWASP A07:2021 | `/lib/auth.ts`<br>`/components/AuthModal.tsx` | **RÉSOLU** | Longueur minimale rehaussée à 12 caractères côté serveur (Better Auth) et validation dynamique côté client. |
| **SEC-10** | **Dépendances NPM présentant des avis de sécurité**<br>Alertes secondaires amonts. | **FAIBLE** | **4.8** | CWE-1395 / CWE-1321<br>OWASP A06:2021 | `package.json`<br>`.github/workflows/test.yml` | ⚠️ **PARTIELLEMENT SUIVI** | La CI exécute lint, tests et build. Elle n'exécute toutefois pas `npm audit` ni outil SAST/SCA dédié ; l'affirmation de suivi intégré à la CI n'est donc pas entièrement exacte. |
| **SEC-11** | **Diffusion SSE arbitraire sans authentification**<br>`POST /api/events` accepte un type, un acteur et un payload fournis par le client puis les diffuse à tous les abonnés. | **ÉLEVÉ** | **8.2** | CWE-306 / CWE-862<br>OWASP API1:2023 | `/app/api/events/route.ts` | **OUVERT** | Ajouter une authentification obligatoire, restreindre les types autorisés aux événements internes et supprimer ou verrouiller cette route publique. |
| **SEC-12** | **Authentification sur stockage JSON hors PostgreSQL**<br>Si `DATABASE_URL` n'est pas configuré, Better Auth utilise un adaptateur JSON local en plus des données en mémoire. | **ÉLEVÉ** | **7.5** | CWE-312 / CWE-538<br>OWASP A02:2021 | `/lib/auth.ts` | ⚠️ **MODE DE SECOURS** | Ce fallback permet le fonctionnement hors base, mais persiste sessions/comptes/utilisateurs dans `data/auth_fallback.json`. Il manque sauvegarde, rotation des secrets, restrictions de déploiement multi-instances et protection opérationnelle explicite. |

---

## 2. État des Chantiers d'Architecture Initiaux (Clarification de Portée)

Pour lever toute ambiguïté entre observabilité et résolution effective :

### A. Surveillance d'état et diagnostic (`/api/health`)
* **Statut :** **SURVEILLANCE OPÉRATIONNELLE (Persistance Tâches Uniquement)**
* **Précision :** Le point de contrôle `/api/health` réalise réellement un ping PostgreSQL et retourne HTTP 503 en production si la base est configurée mais indisponible. Il signale seulement la présence des secrets Better Auth/Gemini et du mode d'authentification ; il ne sonde aucune session Better Auth ni aucun appel réel Gemini. Les dossiers de revue (`ReviewDossier`) restent totalement hors base (voir `DT-ARCH-01`).

### B. Modélisation de la table d'utilisateurs (`users` vs `user`)
* **Statut :** **RÉSOLU EN BASE / DIVERGENCE RÔLES EN APPLICATION**
* **Précision :** L'unification structurelle de la table SQL `user` est effective dans Drizzle. Cependant, un décrochage persiste entre l'énumération SQL des rôles système et les rôles du workflow Maker-Checker (voir `DT-ARCH-08`).

### C. Gestion du Mode Hors-Ligne (PWA / IndexedDB)
* **Statut :** **SÉCURISÉ EN CONTRÔLE D'ACCÈS / NON RÉSOLU EN CONCURRENCE**
* **Précision :** L'endpoint `POST /api/sync` a été blindé contre les attaques BOLA. En revanche, la gestion des conflits d'écritures concurrentes et le rollback lors d'échecs de synchronisation demeurent ouverts (voir `DT-ARCH-06` et `DT-ARCH-09`).

---

## 3. Registre Détaillé des Dettes Techniques & Anomalies

Ce registre recense **14 dettes techniques d'architecture** et **anomalies de conception** documentées et qualifiées.

### 3.1 Dettes Critiques (Blocage Métier ou Perte de Données)

#### DT-ARCH-01 — Absence de persistance PostgreSQL pour les dossiers de revue métier
* **Sévérité :** 🔴 **CRITIQUE**
* **Localisation :** `/app/api/review/dossiers/route.ts` (variable `runtimeDossiers`) · `lib/review-service.ts` (clé localStorage `planit_review_dossiers_v1`)
* **Constat :** Les dossiers (`ReviewDossier`), les diffs textuels et financiers, ainsi que les pistes d'audit légales ne sont stockés que dans la mémoire vive Node.js du serveur et dans le localStorage du navigateur client. Un redémarrage serveur entraîne la perte des dossiers non sauvegardés localement par l'utilisateur.
* **Impact :** Perte de données irrémédiable, impossibilité de garantir la conformité réglementaire promise au cabinet.
* **Remédiation :** Créer la table `review_dossiers` dans `src/db/schema.ts`, générer les migrations Drizzle et migrer `route.ts` sur Drizzle ORM.

#### DT-ARCH-02 — Moteur de rappels sans exécution serveur (Rappels 100% dépendants du navigateur client)
* **Sévérité :** 🔴 **CRITIQUE (Cœur Métier Cabinet)**
* **Localisation :** `components/HomeWorkspace.tsx:551-580` (`evaluateReminders` dans un `setInterval` client de 10s)
* **Constat :** L'évaluation des rappels d'échéance ne s'exécute que lorsque le collaborateur a l'application ouverte et active dans un onglet de son navigateur. Il n'existe **aucun cron serveur, aucun worker asynchrone, ni aucun service d'envoi d'e-mail ou de webhook**.
* **Impact :** Si l'utilisateur ferme l'onglet ou sa machine, les rappels ne se déclenchent pas. Risque direct de manquer une échéance fiscale ou de liasse comptable.
* **Remédiation :** Implémenter un job récurrent côté serveur (route cron sécurisée `/api/cron/reminders` ou worker Node.js) qui évalue les tâches proches de l'échéance et envoie des alertes par e-mail (Resend/SendGrid/Graph API) ou Push Notification PWA WebPush.

#### DT-ARCH-03 — Hub SSE in-process incompatible avec les déploiements multi-instances
* **Sévérité :** 🔴 **CRITIQUE (Scalabilité & Concurrence)**
* **Localisation :** `lib/realtime-hub.ts` · `/app/api/events/route.ts`
* **Constat :** Le `RealtimeEventHub` est un singleton en mémoire vive Node.js. En cas de déploiement multi-conteneurs (ex. 2 instances ou plus sur Render, Railway ou Kubernetes), les événements SSE et la présence ne sont pas partagés entre conteneurs.
* **Impact :** Alertes silencieuses pour les collaborateurs connectés sur une autre instance ; désynchronisation du verrouillage préventif des dossiers.
* **Remédiation :** Remplacer le bus mémoire par un adaptateur Pub/Sub externe (ex. Upstash Redis ou Redis standard via `ioredis`).

---

### 3.2 Dettes Élevées (Sécurité & Intégrité des Données)

#### DT-ARCH-04 — Politiques RLS PostgreSQL ouvertes (`using: sql\`true\``)
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `src/db/schema.ts` (tables `user`, `tasks`, `workspaces`, `notifications`)
* **Constat :** Bien que `.enableRLS()` soit activé sur chaque table, toutes les politiques autorisent tout le trafic (`using: sql\`true\``, `withCheck: sql\`true\``). L'isolation dépend uniquement des filtres manuels écrits dans le code applicatif TypeScript.
* **Impact :** Pas de défense en profondeur au niveau du moteur PostgreSQL.
* **Remédiation :** Définir de réelles expressions RLS basées sur le contexte utilisateur de session (`current_setting('app.current_user_id', true)`).

#### DT-ARCH-05 — Adresse IP factice dans le journal d'audit légal
* **Sévérité :** 🟠 **ÉLEVÉ**
* **Localisation :** `lib/review-service.ts` L.114 : `const ip = options?.ipAddress || '192.168.1.88';`
* **Constat :** Si `executeWorkflowTransition` est appelé sans renseigner `ipAddress` (notamment lors de manipulations côté client), une adresse IP locale arbitraire (`192.168.1.88`) est inscrite dans la piste d'audit.
* **Impact :** Décrédibilisation de la valeur probante du journal d'audit face à un tiers ou une autorité de contrôle.
* **Remédiation :** Exécuter toutes les transitions d'état exclusivement côté serveur via l'API, en extrayant obligatoirement l'IP réelle des en-têtes `x-forwarded-for` / `x-real-ip`.

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

### 3.3 Dettes Modérées (Ergonomie, Exploitation & Robustesse)

#### DT-ARCH-08 — Écriture optimiste sans rollback sur la création/mise à jour de tâches
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `components/HomeWorkspace.tsx` (`handleSaveTask`) · `docs/guides/flux-creation-assignation-tache.md` L.164
* **Constat :** `saveTasks` persiste immédiatement la nouvelle tâche dans le localStorage et l'IndexedDB du créateur avant la réponse de l'API `POST /api/tasks`. Si le serveur échoue (code HTTP 500, erreur réseau ou contrainte SQL rompue), l'interface client ne procède à aucun rollback et ne présente aucune alerte persistante de désynchronisation.
* **Impact :** Faux sentiment de sécurité pour le collaborateur qui croit sa tâche enregistrée et assignée alors qu'elle n'existe pas sur le serveur.
* **Remédiation :** Marquer temporairement la tâche comme `syncPending: true`, attendre l'acquittement HTTP du serveur, et annuler ou alerter visuellement l'utilisateur en cas d'échec persistant.

#### DT-ARCH-09 — Absence de résolution de conflits offline/online (Synchronisation)
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `lib/usePlanitStore.ts` · `/app/api/sync/route.ts`
* **Constat :** En mode hors-ligne, si deux modifications concurrentes sont apportées sur une tâche par deux utilisateurs différents, le dernier appel à `/api/sync` écrase l'état sans contrôle d'antériorité ni détection de conflit (contrairement au module de revue qui possède un OCC `version`).
* **Impact :** Écrasement silencieux d'amendements ou de statuts de tâches.
* **Remédiation :** Généraliser le contrôle de concurrence optimiste (OCC) avec `version` ou horodatage `updatedAt` sur la table `tasks`.

#### DT-ARCH-10 — Fonctionnalité PRD manquante : Attribution automatique du superviseur par département
* **Sévérité :** 🟡 **MODÉRÉE (Dette Fonctionnelle)**
* **Localisation :** `components/review/NewDossierModal.tsx` · `lib/review-service.ts` · `PRD.md`
* **Constat :** Bien que le PRD et le README mettent en avant l'« *Attribution dynamique : Assignation automatique ou manuelle d'un superviseur / manager selon le département et la typologie* », le code instancie les dossiers avec un champ `checker: undefined`. Aucun algorithme de round-robin ni de détection du manager de département n'est exécuté lors de la soumission.
* **Impact :** Dépendance exclusive envers une saisie ou une réclamation manuelle de dossier par les superviseurs.
* **Remédiation :** Développer un résolveur d'affectation automatique interrogeant les utilisateurs au rôle `manager` du département concerné lors de la création ou du passage au statut `soumis`.

#### DT-ARCH-11 — Rapports PDF limités à l'impression client (`window.print`)
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `components/ExecutiveReportModal.tsx` · `lib/report-generator.ts`
* **Constat :** Le moteur de synthèse s'appuie uniquement sur les styles d'impression CSS du navigateur.
* **Impact :** Incapacité d'exporter ou d'envoyer des bilans PDF la nuit ou automatiquement aux associés.
* **Remédiation :** Mettre en place un service de rendu PDF headless (Chromium ou `@react-pdf/renderer`).

#### DT-ARCH-12 — Absence de tests de bout en bout (E2E)
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** Répertoire `/tests` (20 fichiers de tests unitaires/intégration Vitest, 0 test Playwright)
* **Constat :** Les flux interactifs complets (authentification multi-rôles, cycle de vie complet Maker-Checker) ne sont pas testés dans un navigateur réel automatisé.
* **Impact :** Risque de régression de navigation ou de rendu.
* **Remédiation :** Mettre en place Playwright pour les 5 scénarios critiques du cabinet.

#### DT-ARCH-13 — Observabilité de santé partielle pour les services déclarés
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `/app/api/health/route.ts`
* **Constat :** Le health check vérifie réellement PostgreSQL, tandis que Better Auth et Gemini sont uniquement annoncés via leur mode/configuration sans sonde opérationnelle. Il ne vérifie ni les dossiers de revue (hors base), ni le worker/cron de rappels, ni Redis/SSE externe. Le champ IA indique également `Gemini 2.5 Flash` alors que la route utilise `gemini-3.7-flash`.
* **Impact :** Une application peut être considérée saine alors qu'un flux cœur métier est indisponible ou que l'identification de la version IA est erronée.
* **Remédiation :** Ajouter des sondes ciblées pour chaque dépendance métier critique et faire dériver les métadonnées IA du modèle réellement configuré.

#### DT-ARCH-14 — Moteur de rappels sans persistance atomique ni journal d'exécution
* **Sévérité :** 🟡 **MODÉRÉE**
* **Localisation :** `components/HomeWorkspace.tsx` · `lib/reminders.ts`
* **Constat :** Le navigateur utilise un intervalle de 10 secondes, mais la mise à jour `reminderTriggered`, les notifications locales et l'appel `POST /api/tasks` ne forment pas une transaction atomique. Il n'existe aucun historique serveur des rappels effectivement envoyés.
* **Impact :** Double déclenchement possible lors de multi-clients, absence de preuve d'envoi et récupération imparfaite après panne.
* **Remédiation :** Établir une table ou file de rappels, avec verrouillage atomique, journal de livraison et exécuteur serveur idempotent.

---

## 4. Feuille de Route Priorisée

```
[Priorité 1 - Vital]        DT-ARCH-01 (Persistance PostgreSQL Dossiers)
                            DT-ARCH-02 (Cron/Worker Rappels Serveur)
[Priorité 2 - Sécurité]     SEC-07 (CSP & HSTS dans next.config.ts)
                            DT-ARCH-05 (IP réelle dans l'Audit Trail)
                            DT-ARCH-04 (Durcissement RLS SQL)
                            SEC-03 (Suppression du secret d'authentification hardcodé)
                            SEC-11 (Sécurisation de POST /api/events)
                            SEC-12 (Durcissement du fallback d'authentification JSON)
[Priorité 3 - Architecture] DT-ARCH-06 (Suppression ensureDatabaseTables au runtime)
                            DT-ARCH-07 (Unification des rôles système / métier)
                            DT-ARCH-03 (Redis Pub/Sub pour le SSE)
                            SEC-08 (Rate limiting distribué)
[Priorité 4 - Résilience]   DT-ARCH-08 (Rollback sur écriture optimiste des tâches)
                            DT-ARCH-09 (Résolution conflits offline)
                            DT-ARCH-10 (Attribution auto superviseur PRD)
                            DT-ARCH-14 (Rappels atomiques & journalisés)
[Priorité 5 - Outils]       DT-ARCH-11 (Génération PDF serveur)
                            DT-ARCH-12 (Tests E2E Playwright)
                            DT-ARCH-13 (Health checks métier complets)
                            SEC-10 (SCA/Dépendances dans la CI)
```
