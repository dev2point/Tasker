---
Jour: Mercredi 11 Novembre 2026 (2026-11-11)
Heure de la dernière modif: 08:00:00 PST (16:00:00 UTC)
Auteur: niceboy
Module: Intégrations Externes, PWA & Écosystème Microsoft 365
---

# 🌐 Module 07 — Intégrations Externes, PWA & Écosystème Microsoft 365

## 1. Description du Module & Enjeux Métier

Les professionnels du chiffre et du droit fiscal évoluent au quotidien dans l'environnement bureautique d'entreprise (Outlook, Teams, Excel, SharePoint). 

Le module d'intégrations externes et d'accessibilité mobile assure :
- **L'interopérabilité fluide avec Microsoft 365 :** Synchronisation bidirectionnelle des tâches avec Microsoft To-Do / Planner, injection des échéances de déclarations fiscales dans le calendrier Outlook des associés, et notification des équipes via canaux Microsoft Teams dédiés.
- **L'export calendaire standardisé (iCalendar RFC 5545) :** Permet à tout collaborateur d'intégrer son calendrier d'obligations fiscales dans son smartphone (Apple Calendar, Google Calendar, Thunderbird).
- **L'expérience Progressive Web App (PWA) :** Installation native sur poste de travail (macOS, Windows, ChromeOS) et tablettes/mobiles (iOS, Android), offrant une réactivité instantanée et une continuité de service hors-ligne complète.

---

## 2. Architecture Technique & Passerelles d'Intégration

```
+--------------------------------------------------------------------------+
|                              mfisca-tasks Core                           |
|       (Tâches, Échéances Légales, Dossiers de Revue, Alertes)            |
+--------------------------------------------------------------------------+
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
+---------------------+   +---------------------+   +---------------------+
|      PWA Engine     |   |   Microsoft 365     |   |      iCalendar      |
|  - Service Worker   |   |  - Microsoft Graph  |   |  - lib/ical.ts      |
|  - Web Manifest     |   |  - Outlook Calendar |   |  - Flux standard    |
|  - Cache Storage    |   |  - Teams Webhooks   |   |  - Synchronisation  |
|  - Offline fallback |   |  - Microsoft365Modal|   |    smartphones      |
+---------------------+   +---------------------+   +---------------------+
           │                         │                         │
           ▼                         ▼                         ▼
[ App Native Desktop ]     [ Tenant Entreprise ]    [ Terminaux Mobiles ]
```

### Fichiers Clés du Module :
- `/docs/guides/azure-entra-id-setup.md` : Guide pas-à-pas complet d'inscription d'application Azure Entra ID pour obtenir `NEXT_PUBLIC_AZURE_CLIENT_ID` et `NEXT_PUBLIC_AZURE_TENANT_ID`.
- `/components/Microsoft365Modal.tsx` : Interface de paramétrage de la synchronisation avec le tenant Microsoft 365 de l'organisation et guide intégré.
- `/lib/microsoft/` : Bibliothèque de communication avec l'API Microsoft Graph (gestion des autorisations, création d'événements de calendrier, envoi de cartes adaptatives Teams).
- `/lib/ical.ts` : Générateur conforme à la norme iCalendar RFC 5545 produisant des fichiers `.ics` avec alarmes de rappel configurées.
- `/components/pwa/` : Composants de détection de support PWA, bannière d'installation personnalisée et gestion du cycle de vie du Service Worker.

---

## 3. Historique d'Évolution & Avancements Récents

- **Phase 1 :** Implémentation du générateur de flux iCalendar (.ics) avec encodage UTF-8 et gestion des fuseaux horaires (Paris / UTC).
- **Phase 2 :** Mise en place du module `Microsoft365Modal.tsx` avec sélection des flux à synchroniser (toutes les tâches, uniquement les tâches critiques, uniquement les échéances du département).
- **Phase 3 :** Enregistrement du Web App Manifest (`manifest.json`) et configuration des icônes vectorielles adaptées pour l'installation sur écran d'accueil.
- **Phase 4 :** Prise en charge des rappels automatiques avec calcul du préavis avant l'échéance légale (alerte à J-7, J-2 et J-0).
- **Phase 5 :** Rédaction et publication du guide technique d'intégration Azure Entra ID (`/docs/guides/azure-entra-id-setup.md`) explicitant l'obtention des clés `NEXT_PUBLIC_AZURE_CLIENT_ID` et `NEXT_PUBLIC_AZURE_TENANT_ID`, la configuration SPA / PKCE et les autorisations déléguées Microsoft Graph (`User.Read`, `Calendars.ReadWrite`).

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-INT-01 : Gestion du renouvellement automatique des jetons OAuth Microsoft Graph
- **Description :** Le flux actuel d'authentification avec Microsoft Graph stocke le jeton d'accès temporaire et nécessite une ré-authentification manuelle lorsque le refresh token arrive à expiration.
- **Cause racine :** Éviter de stocker des refresh tokens de longue durée côté client pour des raisons de conformité de sécurité.
- **Impact :** Un collaborateur peut voir la synchronisation de son calendrier Outlook interrompue après plusieurs jours sans reconnexion explicite.
- **Plan de remédiation :** Mettre en place un échange sécurisé de refresh tokens via une route API Next.js dédiée (`/api/integrations/microsoft/refresh`) avec stockage chiffré des secrets en base PostgreSQL.

### DT-INT-02 : Invalidation et stratégie de cache du Service Worker à affiner
- **Description :** La stratégie de mise en cache du Service Worker applique un modèle `Stale-While-Revalidate` sur les bundles JS et les assets statiques sans purge chirurgicale lors des déploiements intermédiaires.
- **Cause racine :** Volonté de maximiser la vitesse de chargement initial et la disponibilité hors-ligne.
- **Impact :** Dans de rares cas, des utilisateurs ayant une session PWA ouverte en continu peuvent conserver une version antérieure du bundle jusqu'au rechargement forcé de la fenêtre.
- **Plan de remédiation :** 
  1. Émettre un événement d'invalidation de cache `SKIP_WAITING` avec notification visuelle "Une nouvelle version est disponible — Rafraîchir".
  2. Indexer le cache du Service Worker sur le numéro de build injecté au moment du `next build`.

### DT-INT-03 : Absence de Webhooks entrants Microsoft Teams
- **Description :** L'intégration Teams fonctionne en mode descendant (envoi de notifications d'échéances et de revues vers un canal Teams via webhook sortant), mais ne permet pas à un checker de valider une tâche directement depuis Teams en répondant à un message.
- **Cause racine :** Nécessité d'enregistrer un bot conversationnel Azure complet avec URL de rappel publique permanente.
- **Impact :** L'utilisateur notifié sur Teams doit obligatoirement cliquer sur le lien pour ouvrir l'application web et valider le dossier.
- **Plan de remédiation :** Déployer un connecteur Actionable Messages / Adaptive Cards avec endpoint récepteur d'actions certifié.
