---
Jour: Lundi 2 Novembre 2026 (2026-11-02)
Heure de la dernière modif: 00:52:00 PST (08:52:00 UTC)
Auteur: niceboy
Module: Persistance, Base de Données Hybride & Synchronisation
---

# 🗄️ Module 05 — Persistance, Base de Données Hybride & Synchronisation

## 1. Description du Module & Enjeux Métier

La persistance des données dans **mfisca-tasks** doit concilier deux exigences a priori contradictoires :
1. **L'intégrité transactionnelle absolue et la centralisation** requises pour les données comptables et fiscales (PostgreSQL avec Drizzle ORM).
2. **La disponibilité hors-ligne ininterrompue** pour les experts en déplacement chez les clients ou lors d'audiences contentieuses sans couverture réseau optimale (IndexedDB / LocalStorage réactif).

Ce module orchestre la synchronisation bidirectionnelle entre le cache local de l'utilisateur et la base de données relationnelle centrale, tout en prévenant les fuites d'informations et les collisions de données.

---

## 2. Architecture de Persistance Hybride

```
                                [ Client Web / Navigateur ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ usePlanitStore.ts ]                       [ IndexedDB Cache ]
          (État mémoire réactif Zustand)               (Stockage hors-ligne PWA)
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             │  Requête HTTPS / TLS
                                             ▼
                               [ /app/api/sync/route.ts ]
                               (Validation de session & RBAC)
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
             [ Mode PostgreSQL Actif ]               [ Mode Fallback Mémoire ]
           - Pool de connexion pg / Neon           - Tampon sécurisé d'urgence
           - Drizzle ORM Schema                    - Alerte diagnostic /api/health
           - Transactions SQL ACID                               │
                         │                                       │
                         └───────────────────┬───────────────────┘
                                             ▼
                                 [ Base de Données PG ]
                              - Tables : user, task, review_dossier
                              - Logs d'audit & relations référentielles
```

### Fichiers Clés du Module :
- `/src/db/schema.ts` : Définition unique du schéma relationnel Drizzle (tables `user`, `account`, `session`, `verification`, `task`, `review_dossier`).
- `/lib/db/pg.ts` & `/lib/db.ts` : Gestionnaire de pool PostgreSQL résilient avec détection d'erreurs transitoires et reconnexion automatique.
- `/app/api/sync/route.ts` : Endpoint de synchronisation incrémentale sécurisé (RBAC strict empêchant l'écrasement ou l'extraction illicite de tâches tierces).
- `/app/api/health/route.ts` : Contrôleur de diagnostic système vérifiant la latence de la base, le statut Better Auth et la disponibilité de l'IA.

---

## 3. Historique d'Évolution & Résolution des Dettes Antérieures

- **Résolution Dette 2.B (Double Modélisation `user` vs `users`) :** Unification complète dans `src/db/schema.ts` autour de la table `user` de Better Auth enrichie avec les champs métiers du cabinet. L'alias rétrocompatible `export const users = user` élimine les doubles requêtes et les jointures manuelles.
- **Résolution Dette SEC-01 (BOLA sur l'API Sync) :** Application systématique du filtrage RBAC sur `POST /api/sync` : un utilisateur non-administrateur ne peut extraire que les tâches dont il est le créateur ou l'assigné.
- **Création du Healthcheck Système :** Mise en place de `/api/health` qui renvoie un statut HTTP 503 en cas de rupture de liaison PostgreSQL en production, permettant aux orchestrateurs (Render, Kubernetes) de relancer ou basculer les conteneurs.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-DAT-01 : Stratégie de résolution de conflits "Last-Write-Wins" simplifiée
- **Description :** Lors de la synchronisation d'une tâche modifiée hors-ligne par un collaborateur alors qu'elle a également été modifiée en ligne par un autre, c'est l'horodatage le plus récent qui l'emporte, écrasant les modifications concurrentes champ par champ.
- **Cause racine :** Arbitrage initial privilégiant la simplicité d'implémentation par rapport à un protocole lourd de type CRDT (Conflict-free Replicated Data Types) ou Three-Way Merge.
- **Impact :** Risque potentiel de perte partielle d'information si deux collaborateurs éditent simultanément la description ou les pièces jointes d'une même tâche.
- **Plan de remédiation :** 
  1. Introduire un horodatage au niveau des champs individuels (Field-level timestamps).
  2. En cas de conflit avéré, créer une copie d'amendement "Version en conflit" et notifier les deux collaborateurs.

### DT-DAT-02 : Absence de partitionnement temporel sur la table des logs d'audit
- **Description :** La table consignant l'ensemble des événements d'audit ne dispose pas de partitionnement par trimestre ou par an (`RANGE PARTITIONING`).
- **Cause racine :** Volume de démarrage modéré ne justifiant pas la complexité du partitionnement DDL lors de la phase initiale.
- **Impact :** À terme (après 3 ans d'activité d'un cabinet avec plus de 50 collaborateurs), la table d'audit pourra compter plusieurs centaines de milliers d'enregistrements, ralentissant les recherches d'audit complexes.
- **Plan de remédiation :** Mettre en place un partitionnement déclaratif PostgreSQL par année fiscale sur `created_at` et une stratégie d'archivage automatique vers stockage froid S3/Glacier.

### DT-DAT-03 : Indexation partielle sur les métadonnées JSON
- **Description :** Certaines recherches textuelles ou filtrages fins dans les champs JSON de métadonnées s'exécutent par balayage séquentiel (`Seq Scan`) faute d'index GIN (`jsonb_path_ops`).
- **Cause racine :** Structuration progressive des types de métadonnées spécifiques aux déclarations fiscales.
- **Impact :** Temps de réponse accru sur les requêtes de recherche de numéros d'avis fiscaux ou de références cadastrales enfouies dans le JSON.
- **Plan de remédiation :** Ajouter des index GIN ciblés dans `src/db/schema.ts` sur les colonnes de type `jsonb`.
