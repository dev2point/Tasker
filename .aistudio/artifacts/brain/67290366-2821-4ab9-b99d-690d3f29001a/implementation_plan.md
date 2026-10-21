# Espace Développeur Professionnel Microsoft & Intégration PlanIt

Ce plan détaille exactement tous les éléments requis, les démarches administratives et techniques, ainsi que l'intégration directe dans l'application PlanIt d'un guide interactif et d'un banc de test de connexion Microsoft Entra ID / Graph API.

> [!IMPORTANT]
> **Décisions & Réponses Confirmées** :
> - **Objectif principal** : Continuer le développement de l'application actuelle (authentification MSAL, synchronisation Outlook Calendrier, OneDrive/SharePoint, To Do et Teams via Microsoft Graph).
> - **Nom de domaine** : Vous disposez déjà de votre propre nom de domaine professionnel personnalisé (ex. `cabinet-avocat.fr` ou `votre-entreprise.com`).

---

## 1. Ce qu'il vous faut exactement aujourd'hui (Checklist Prérequis)

Pour créer un compte professionnel Microsoft et ouvrir l'espace développeur avec votre propre domaine, voici les éléments nécessaires :

1. **Votre nom de domaine personnalisé & l'accès à sa zone DNS** :
   - Accès à la console d'administration de votre registrar (OVH, Cloudflare, Gandi, Hostinger, etc.).
   - Vous devrez y ajouter un enregistrement `TXT` de vérification (type `MS=msXXXXXXXX`) fourni par Microsoft pour prouver que vous êtes le propriétaire légitime du domaine.
2. **Une ligne mobile valide pour le 2FA (Double Authentification)** :
   - Réception de code SMS ou configuration de l'application **Microsoft Authenticator** (obligatoire sur tous les tenants professionnels Microsoft Entra ID).
3. **Une adresse email de secours / contact** :
   - Pour recevoir les notifications de secours et de facturation.
4. **Informations légales d'identification** :
   - Raison sociale de votre structure, adresse postale, et le cas échéant numéro d'enregistrement (SIRET/TVA).
5. **Carte bancaire de vérification (sans débit automatique obligatoire)** :
   - Requise par Microsoft pour l'activation du compte Azure Développeur (offre gratuite avec 200 $ de crédits ou tenant Azure AD / Entra ID gratuit avec 50 000 identités mensuelles).

---

## 2. Les Démarches Étape par Étape

```
┌────────────────────────────┐     ┌────────────────────────────┐     ┌────────────────────────────┐
│   1. Création du Tenant    │     │   2. Liaison du Domaine    │     │  3. Espace Développeur     │
│   Microsoft Entra ID / 365 ├───>│    Ajout DNS TXT / MX      ├───>│  Inscriptions d'app (SPA)  │
│   admin.microsoft.com      │     │    Validation Registrar    │     │  Client ID & Graph Scopes  │
└────────────────────────────┘     └────────────────────────────┘     └──────────────┬─────────────┘
                                                                                     │
                                                                                     ▼
                                                                      ┌────────────────────────────┐
                                                                      │ 4. Intégration PlanIt App  │
                                                                      │ Configuration .env / Hub   │
                                                                      │ Tests de connectivité      │
                                                                      └────────────────────────────┘
```

### Étape A : Créer le locataire professionnel (Tenant Microsoft Entra ID)
- Accédez à [signup.microsoft.com](https://signup.microsoft.com) ou créez un compte d'évaluation Microsoft 365 Business (ex. essai gratuit 30 jours) ou un compte Azure gratuit sur [azure.microsoft.com/free](https://azure.microsoft.com/free).
- Microsoft vous attribue d'abord un identifiant technique par défaut du type `admin@votreorganisation.onmicrosoft.com`.

### Étape B : Lier votre propre nom de domaine personnalisé
- Connectez-vous sur le **Centre d'administration Microsoft 365** ([admin.microsoft.com](https://admin.microsoft.com)) avec votre compte administrateur.
- Allez dans **Paramètres > Domaines > Ajouter un domaine**.
- Saisissez votre nom de domaine personnalisé.
- Copiez la valeur TXT générée par Microsoft (`MS=ms12345678`) et collez-la dans la zone DNS de votre hébergeur.
- Cliquez sur **Vérifier** : votre domaine devient actif. Vous pouvez créer votre compte de travail final, par exemple `dev@votredomaine.com`.

### Étape C : Accéder à l'espace développeur & Inscription d'application
- Rendez-vous sur le **Portail Microsoft Entra** ([entra.microsoft.com](https://entra.microsoft.com)) ou le **Portail Azure** ([portal.azure.com](https://portal.azure.com)).
- Accédez à **Applications > Inscriptions d'applications > Nouvelle inscription**.
- Renseignez :
  - **Nom** : `PlanIt Professional App`
  - **Types de comptes pris en charge** : `Comptes dans un annuaire organisationnel` (ou multilocataire si vous distribuez à des tiers).
  - **URI de redirection** : Choisir **SPA (Single-Page Application)** et saisir l'URL de votre application PlanIt.
- Dans **Autorisations de l'API (Microsoft Graph)**, ajoutez les autorisations déléguées indispensables pour notre application :
  - `User.Read` (Profil utilisateur)
  - `Calendars.ReadWrite` (Synchronisation avec le calendrier Outlook)
  - `Files.ReadWrite.All` (Sauvegarde et coédition sur OneDrive et SharePoint)
  - `Tasks.ReadWrite` (Synchronisation bidirectionnelle avec Microsoft To Do / Planner)
- Récupérez l'**ID d'application (client)** et l'**ID de l'annuaire (locataire)**.

---

## 3. Amélioration Prévue dans l'Application PlanIt

Pour vous simplifier le travail dès la validation de ce plan, nous allons enrichir le Hub Microsoft 365 existant (`components/Microsoft365Modal.tsx`) avec un **Assistant Développeur Intégré** :

1. **Onglet Développeur Interactif dans le Hub M365** :
   - Guide pas-à-pas interactif avec liens directs préformatés vers les portails Microsoft.
   - Assistant de calcul de zone DNS adapté à votre domaine.
   - Saisie et validation en direct de vos identifiants (`Client ID`, `Tenant ID`).
2. **Banc de Test de Connectivité Graph & MSAL** :
   - Bouton de diagnostic en un clic pour tester l'authentification token OAuth, le scope des permissions accordées et la synchronisation sans recharger la page.
3. **Générateur de Variables d'Environnement** :
   - Export en 1 clic des clés au format `.env.local` pour le déploiement ou l'exécution locale.

---

## 4. Vérification & Validation

- Exécution des tests de non-régression (`npm test` et `npm run test:load`).
- Compilation complète de l'application via `compile_applet`.
- Vérification de l'ouverture et de la réactivité du Hub Microsoft 365 sur desktop et mobile.
