---
Jour: Lundi 2 Novembre 2026 (2026-11-02)
Heure de la dernière modif: 00:52:00 PST (08:52:00 UTC)
Auteur: niceboy
Module: Sécurité Applicative, Contrôle d'Accès (RBAC) & Audit Trail
---

# 🔒 Module 06 — Sécurité Applicative, Contrôle d'Accès (RBAC) & Audit Trail

## 1. Description du Module & Enjeux Métier

Les cabinets d'expertise fiscale et de conseil juridique manipulent des informations hautement confidentielles : liasses fiscales confidentielles, bilans patrimoniaux, stratégies de contentieux contre l'administration fiscale et données personnelles d'actionnaires. 

Le module de sécurité et de contrôle d'accès garantit :
- **Le respect strict du secret professionnel :** Étanchéité absolue entre les dossiers des différents clients et restriction d'accès selon les départements d'exercice.
- **La conformité OWASP Top 10 :** Protection impérative contre les attaques par contrôle d'accès brisé (BOLA/IDOR), injections, contournements d'authentification et déni de service par épuisement de quota IA.
- **La traçabilité probante (Audit Trail) :** Enregistrement inaltérable de chaque consultation, création, modification, validation ou rejet de document avec identifiant cryptographique et horodatage certifié.

---

## 2. Architecture de Sécurité & Flux d'Autorisation

```
                                [ Client / Requête HTTP ]
                                            │
                                            ▼
                              [ Middleware & Next.js Headers ]
                                - X-Content-Type-Options: nosniff
                                - Referrer-Policy: strict-origin
                                - Permissions-Policy
                                            │
                                            ▼
                             [ lib/rate-limit.ts (Sliding Window) ]
                                - API IA : 20 req/minute max
                                - API Sync : 60 req/minute max
                                            │
                                            ▼
                             [ lib/auth-server.ts (Better Auth) ]
                                - getAuthenticatedUser(req)
                                - Validation cryptographique du cookie session
                                - Refus des identifiants arbitraires non authentifiés
                                            │
                                            ▼
                               [ lib/rbac.ts (Contrôle RBAC) ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
     [ Rôle: Admin / Super ]      [ Rôle: Manager / Associé ]   [ Rôle: Collaborateur / Junior ]
      - Accès global               - Périmètre département       - Tâches assignées / créées
      - Audit système              - Approbation Maker-Checker   - Soumission de dossiers
      - Configuration cabinet      - Gestion des assignations    - Vue restreinte client
                                            │
                                            ▼
                          [ Exécution Action & Journalisation ]
                                            │
                                            ▼
                          [ components/review/AuditTrailViewer ]
                            (Traçabilité consultable en temps réel)
```

### Fichiers Clés du Module :
- `/lib/rbac.ts` : Matrice formelle des droits d'accès (`hasPermission`, `canAccessDepartment`, `canReviewDossier`).
- `/lib/auth-server.ts` & `/lib/auth.ts` : Configuration sécurisée de Better Auth (mots de passe >= 12 caractères, cookies sécurisés `Partitioned; Secure; HttpOnly`).
- `/lib/rate-limit.ts` : Limitation de débit avec algorithme de fenêtre glissante en mémoire protégeant les quotas IA et l'intégrité de la base.
- `/components/review/AuditTrailViewer.tsx` : Interface d'inspection des journaux d'audit avec filtres par acteur, action et plage de dates.
- `/tests/rbac-permissions.test.ts` : Batterie de tests automatisés vérifiant l'inviolabilité des barrières d'accès.

---

## 3. Historique d'Évolution & Remédiation des Vulnérabilités

Le module a fait l'objet d'un audit de sécurité approfondi ayant conduit à la résolution de 9 vulnérabilités répertoriées dans `/docs/technical-debt.md` :
- **SEC-01 (BOLA sur `/api/sync`) :** Résolu via filtrage systématique côté serveur `or(eq(creatorId, user.id), eq(assigneeId, user.id))`.
- **SEC-02 (Contournement IA via `x-user-id`) :** Résolu par élimination du header arbitraire et extraction obligatoire de la session cryptographique signée.
- **SEC-03 & SEC-04 (Sécurité des cookies et clés) :** Remplacement des secrets de secours et activation des cookies de session partitionnés et sécurisés.
- **SEC-05 (BOLA sur `/api/review/dossiers`) :** Résolu par vérification stricte du rôle du demandeur avant modification de dossier.
- **SEC-08 (Rate Limiting) :** Implémentation du module de limitation de débit sur les routes sensibles.
- **SEC-09 (Mots de passe) :** Rehaussement du standard à 12 caractères minimum avec validation de complexité.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-SEC-01 : Rate Limiter en mémoire locale (In-Memory Map)
- **Description :** Le suivi des quotas dans `lib/rate-limit.ts` s'appuie sur une `Map` JavaScript en mémoire de l'instance Next.js.
- **Cause racine :** Éviter une dépendance externe obligatoire (type instance Redis/Upstash) pour l'exécution locale et les tests.
- **Impact :** En cas de déploiement en cluster multi-instances (horizontal auto-scaling sur plusieurs conteneurs), les compteurs de requêtes ne sont pas partagés entre les pods, permettant théoriquement de dépasser le quota global si les requêtes sont distribuées de façon homogène.
- **Plan de remédiation :** Brancher un adaptateur Redis distribué optionnel (ex: `@upstash/ratelimit` ou `ioredis`) activé automatiquement dès que la variable d'environnement `REDIS_URL` est renseignée.

### DT-SEC-02 : Rétention des logs d'audit sans archivage scellé légal
- **Description :** Les événements d'audit sont conservés sous forme d'enregistrements en base de données relationnelle sans signature cryptographique de bloc (type hash-chaining ou horodatage RFC 3161 auprès d'une autorité de certification).
- **Cause racine :** Complexité de déploiement d'un module d'horodatage qualifié eIDAS en phase de développement.
- **Impact :** En cas de litige judiciaire de haut niveau, un administrateur ayant un accès direct à la base de données brute pourrait techniquement modifier un log sans que cela soit mathématiquement détectable par signature de bloc.
- **Plan de remédiation :** Mettre en place un hachage en chaîne (SHA-256 du log précédent inclus dans le log suivant, similaire à un registre immuable) et archiver des instantanés scellés mensuellement.

### DT-SEC-03 : Absence d'authentification multi-facteurs (MFA / TOTP) obligatoire
- **Description :** L'authentification repose actuellement sur le couple e-mail / mot de passe fort (12+ car.) sans exiger de second facteur (application TOTP Google Authenticator ou clé FIDO2 / WebAuthn).
- **Cause racine :** Simplification du flux initial de qualification pour les bêta-testeurs du cabinet.
- **Impact :** Risque résiduel de compromission en cas de phishing ciblé ou de réutilisation de mot de passe par un collaborateur sur des services tiers.
- **Plan de remédiation :** Activer le plugin Two-Factor de Better Auth avec génération de QR code TOTP et codes de secours obligatoires pour les profils `admin` et `manager`.
