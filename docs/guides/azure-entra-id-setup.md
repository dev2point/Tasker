---
Jour: Mercredi 11 Novembre 2026 (2026-11-11)
Auteur: niceboy
Module: Intégrations Externes, PWA & Écosystème Microsoft 365
Document: Guide de configuration Microsoft Entra ID & Microsoft 365
---

# 📘 Guide Pas-à-Pas : Obtenir `NEXT_PUBLIC_AZURE_CLIENT_ID` et `NEXT_PUBLIC_AZURE_TENANT_ID`

Ce guide détaille la procédure complète pour obtenir un compte professionnel, enregistrer **mfisca-tasks** dans votre console **Microsoft Entra ID** (anciennement Azure Active Directory) et obtenir les identifiants nécessaires à la synchronisation automatique des tâches et échéances avec **Outlook Calendar**, **Microsoft To Do** et **Teams**.

---

## 🏢 0. Prérequis : Disposer d'un Compte Professionnel Microsoft 365

> ⚠️ **Attention aux comptes personnels (`@gmail.com`, `@outlook.com`, `@hotmail.com`, `live.com`) :**  
> Pour enregistrer une application et accéder à Microsoft Entra ID, vous devez impérativement utiliser un **compte professionnel** rattaché à un annuaire d'organisation (*Tenant*). Tenter d'accéder au portail avec un compte personnel non rattaché provoque l'erreur classique `AADSTS16000`.

### Comment obtenir un compte Microsoft 365 Pro ?

#### Option A (100% Gratuite & Recommandée) — Le Programme Développeur Microsoft 365
Microsoft offre gratuitement aux développeurs et intégrateurs un environnement d'entreprise complet :
1. Rendez-vous sur : **[https://developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/microsoft-365/dev-program)**
2. Cliquez sur **Join now** et connectez-vous avec votre compte Microsoft personnel habituel.
3. Remplissez le profil (pays, organisation).
4. Choisissez **Configurable sandbox** (Bac à sable personnalisable).
5. Définissez :
   - Un identifiant administrateur (ex: `admin`).
   - Un nom de domaine Microsoft (ex: `cabinet-fiscal` $\rightarrow$ votre adresse sera `admin@cabinet-fiscal.onmicrosoft.com`).
   - Votre mot de passe.
6. Validez par SMS.
7. 🎉 **Résultat :** Vous disposez immédiatement d'un annuaire d'entreprise Entra ID complet avec 25 licences professionnelles E5 gratuites et les droits administrateurs complets.

#### Option B — L'Essai Gratuit 30 Jours Officiel
1. Rendez-vous sur le comparatif des offres [Microsoft 365 Business](https://www.microsoft.com/fr-fr/microsoft-365/business/compare-all-microsoft-365-business-products).
2. Choisissez **Microsoft 365 Business Standard** ou **Business Basic** et cliquez sur **Essayer gratuitement pendant 1 mois**.
3. Suivez l'assistant de création pour obtenir votre compte en `@votre-cabinet.onmicrosoft.com`.

#### Option C — L'Abonnement Professionnel du Cabinet (Production)
1. Rendez-vous sur [Microsoft 365 pour les entreprises](https://www.microsoft.com/fr-fr/microsoft-365/business) et souscrivez à l'offre adaptée (ex: Business Basic à ~5,60 € HT/mois).
2. Dans le portail d'administration ([admin.microsoft.com](https://admin.microsoft.com)), vous pourrez associer votre propre nom de domaine de cabinet (ex: `contact@moncabinet-fiscal.fr`).

---

## 🎯 1. Rôle des Variables d'Environnement

| Variable | Description | Exemples de Valeurs |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | Identifiant public unique de l'application enregistrée dans votre tenant Azure. Utilisé par MSAL (Microsoft Authentication Library) côté navigateur pour initier le flux OAuth 2.0 PKCE. | `4f8a1234-abcd-4ef0-9123-abcdef012345` |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | Identifiant de l'annuaire (tenant) de votre cabinet. Détermine qui peut se connecter. | `common` *(comptes pros et personnels)*<br>`organizations` *(tout compte pro M365)*<br>`8e7b9999-0000-1111-2222-333344445555` *(tenant unique du cabinet)* |

> 🔒 **Sécurité :** Comme ces deux variables commencent par `NEXT_PUBLIC_`, elles sont lues côté client par le navigateur. C'est la configuration standard pour une **Application Monopage (SPA)** utilisant le flux sécurisé **Authorization Code Flow avec PKCE**. **Aucun secret client (Client Secret) ne doit être exposé côté navigateur.**

---

## 🛠️ 2. Procédure Étape par Étape

### Étape 1 : Accéder au portail Microsoft Entra
1. Ouvrez une **fenêtre de navigation privée** *(recommandé pour éviter tout conflit de session)*.
2. Rendez-vous sur le **Microsoft Entra admin center** : [https://entra.microsoft.com](https://entra.microsoft.com)  
   *(Alternativement sur le Portail Azure classique : [https://portal.azure.com](https://portal.azure.com))*.
3. Connectez-vous avec votre **compte professionnel** (ex: `admin@cabinet.onmicrosoft.com` ou `vous@votre-cabinet.fr`).

---

### Étape 2 : Créer une Nouvelle Inscription d'Application
1. Dans le volet de navigation gauche, dépliez **Identité** > **Applications** > **Inscriptions d'applications** (*App registrations*).
2. Cliquez sur le bouton **+ Nouvelle inscription** (*+ New registration*).
3. Remplissez le formulaire comme suit :
   - **Nom :** `mfisca-tasks - Calendrier & Outils Cabinet` *(ou le nom de votre choix)*.
   - **Types de comptes pris en charge :**
     - Si l'application est réservée exclusivement aux membres de votre cabinet :  
       👉 Sélectionnez **Comptes dans cet annuaire organisationnel uniquement (NomDuCabinet uniquement - Monolocataire)**.
     - Si des auditeurs externes ou des collaborateurs utilisant plusieurs annuaires Microsoft 365 doivent se connecter :  
       👉 Sélectionnez **Comptes dans un annuaire organisationnel (Tout annuaire Microsoft Entra ID - Multilocataire)**.

---

### Étape 3 : Configurer l'URI de Redirection (Plateforme SPA)
1. Toujours sur la page d'inscription, dans la section **URI de redirection (facultatif)** :
   - Dans la liste déroulante des plateformes, sélectionnez impérativement **Application monopage (SPA)**.
     *(⚠️ Ne choisissez PAS « Web » ni « Client public/natif »)*.
   - Entrez l'URL de votre application :
     - Pour le développement local : `http://localhost:3000`
     - Pour l'application déployée : l'URL HTTPS de votre déploiement (ex. `https://votre-cabinet.example.com`).
2. Cliquez sur **S'inscrire** (*Register*).

> 💡 **Astuce :** Vous pouvez ajouter plusieurs URI de redirection plus tard (ex: ajouter à la fois l'URL locale `http://localhost:3000` et l'URL de production) dans **Authentification** > **Application monopage** > **Ajouter un URI**.

---

### Étape 4 : Récupérer le Client ID et le Tenant ID
Dès que l'application est créée, vous êtes redirigé vers la page **Vue d'ensemble** (*Overview*).

Dans la section centrale supérieure, repérez et copiez :
1. **ID d'application (client)** / *Application (client) ID* :  
   Il s'agit d'un GUID sous la forme `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.  
   👉 C'est votre valeur pour **`NEXT_PUBLIC_AZURE_CLIENT_ID`**.
2. **ID de l'annuaire (locataire)** / *Directory (tenant) ID* :  
   Il s'agit également d'un GUID.  
   👉 C'est votre valeur pour **`NEXT_PUBLIC_AZURE_TENANT_ID`** *(si vous souhaitez restreindre au tenant du cabinet)*.

---

### Étape 5 : Configurer les Autorisations de l'API Microsoft Graph
Pour que l'application puisse lire le profil de l'utilisateur et synchroniser les échéances dans Outlook Calendar :

1. Dans le menu latéral de l'application, cliquez sur **Autorisations de l’API** (*API permissions*).
2. Cliquez sur **+ Ajouter une autorisation** (*+ Add a permission*).
3. Sélectionnez **Microsoft Graph**, puis **Autorisations déléguées** (*Delegated permissions*).
4. Cochez les autorisations suivantes :
   - `User.Read` *(généralement déjà présente)* : Lire le profil de base du collaborateur.
   - `Calendars.ReadWrite` : Permet d'injecter et de mettre à jour les échéances fiscales dans le calendrier Outlook.
   - `Tasks.ReadWrite` *(optionnel)* : Synchroniser avec Microsoft To Do / Planner.
   - `offline_access` : Permet le maintien de la session sans ressaisie permanente.
5. Cliquez sur **Ajouter des autorisations**.
6. *(Recommandé)* Si vous êtes administrateur du tenant, cliquez sur **Accorder le consentement d'administrateur pour [Organisation]** (*Grant admin consent*). Cela évite à chaque collaborateur d'avoir à valider un écran de consentement individuel lors de sa première utilisation.

---

## 💻 3. Déclaration dans l'Application

Ouvrez votre fichier `.env` ou `.env.local` à la racine du projet et renseignez les valeurs obtenues :

```env
# ==============================================================================
# Microsoft 365 & Entra ID (Synchronisation Outlook Calendar & To-Do)
# ==============================================================================
NEXT_PUBLIC_AZURE_CLIENT_ID="votre-id-d-application-client-ici"
NEXT_PUBLIC_AZURE_TENANT_ID="common" 
# Ou remplacez "common" par l'ID de locataire (GUID) de votre cabinet
```

Après modification des variables d'environnement, redémarrez votre serveur de développement :
```bash
npm run dev
```

---

## 🧪 4. Vérification et Test dans l'Interface

1. Ouvrez l'application **mfisca-tasks**.
2. Dans la barre latérale gauche, cliquez sur l'outil **Microsoft 365** (ou sur la vue Tâches).
3. Cliquez sur l'onglet **Synchronisation Calendrier Outlook & Entra ID**.
4. Cliquez sur le bouton **Se connecter avec Microsoft 365** :
   - La fenêtre de connexion Microsoft s'ouvre.
   - Une fois connecté, votre nom et votre adresse professionnelle s'affichent avec le badge **Connecté à Microsoft 365**.
5. Cliquez sur **Synchroniser vers Outlook Calendar** pour tester l'injection d'une tâche fiscale avec alerte automatique.

---

## ⚠️ 5. Diagnostics & Résolution des Erreurs Fréquentes

| Code d'Erreur / Message | Cause Principale | Solution |
| :--- | :--- | :--- |
| `AADSTS16000: User account ... from identity provider 'live.com' does not exist in tenant 'Microsoft Services'...` | Vous essayez d'ouvrir le portail Azure avec un **compte personnel** non rattaché à un annuaire d'entreprise (ou conflit de cookies). | 1. Ouvrez une **fenêtre de navigation privée**.<br>2. Utilisez votre **compte professionnel** (ex: obtenu via le Developer Program ou votre cabinet).<br>3. Connectez-vous sur [entra.microsoft.com](https://entra.microsoft.com). |
| `AADSTS50011: The reply URL specified in the request does not match...` | L'URL courante dans votre navigateur ne correspond pas exactement aux URI déclarés dans Azure. | Dans le portail Entra, allez dans **Authentification** > **Application monopage**, et ajoutez l'URL exacte (attention aux ports et barres obliques finales, ex: `http://localhost:3000`). |
| `AADSTS700016: Application with identifier ... was not found in the directory` | La valeur de `NEXT_PUBLIC_AZURE_CLIENT_ID` est incorrecte ou l'application a été supprimée. | Vérifiez le copier-coller de l'ID d'application (client) dans `.env`. |
| `AADSTS50194: Application is not installed on this tenant` | Vous avez configuré un tenant restreint alors que l'utilisateur appartient à un autre annuaire. | Définissez `NEXT_PUBLIC_AZURE_TENANT_ID="common"` ou `"organizations"`. |
| Les exports Excel/Word fonctionnent-ils sans ces clés ? | **Oui, à 100%.** | Les exports de feuilles de calcul Excel (`.xlsx`), les dossiers Word (`.docx`) et les calendriers iCal (`.ics`) fonctionnent nativement sans aucune clé Azure. |
