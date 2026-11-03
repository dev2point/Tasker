---
Jour: Lundi 2 Novembre 2026 (2026-11-02)
Heure de la dernière modif: 00:52:00 PST (08:52:00 UTC)
Auteur: niceboy
Module: Métriques Métier, KPIs & Benchmark de Performance
---

# 📊 Module 04 — Métriques Métier, KPIs & Benchmark de Performance

## 1. Description du Module & Enjeux Métier

Le module de métriques et de benchmark fournit aux responsables d'équipes et associés une vue analytique en temps réel sur la rentabilité opérationnelle, le respect des délais et la qualité de production du cabinet.

Dans un contexte fiscal soumis à une forte saisonnalité (période fiscale de clôture des liasses de janvier à mai), ce module permet :
- **L'équilibrage des charges de travail :** Détection précoce des collaborateurs ou des pôles en situation de surchauffe ou de blocage.
- **L'évaluation des temps de cycle :** Analyse du temps écoulé entre la création d'un dossier, sa première revue et son approbation définitive.
- **Le positionnement par rapport au marché (Benchmark) :** Comparaison des indicateurs internes avec les standards d'excellence des cabinets d'audit internationaux (Big 4 et firmes indépendantes de référence).

---

## 2. Architecture Technique & Moteur de Calcul

```
+-------------------------------------------------------------------------+
|                              Source de Données                          |
|             (usePlanitStore.ts - Tâches, Revues, Temps passés)          |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                        lib/benchmark-engine.ts                          |
|  - Calcul de la vélocité moyenne par catégorie de mission               |
|  - Évaluation de l'écart type sur les délais de remise                  |
|  - Algorithme d'alignement avec les référentiels de productivité        |
|  - Calcul de l'indice de maturité organisationnelle                     |
+-------------------------------------------------------------------------+
                                     │
           +-------------------------+-------------------------+
           │                                                   │
           ▼                                                   ▼
+------------------------------------+ +------------------------------------+
|       components/StatsView.tsx     | |    components/BenchmarkModal.tsx   |
|  - Graphiques de répartition       | |  - Écarts relatifs aux standards   |
|  - Taux d'achèvement temps réel    | |  - Recommandations d'optimisation  |
|  - Suivi des charges par pôle      | |  - Simulation de gains de vélocité |
+------------------------------------+ +------------------------------------+
```

### Fichiers Clés du Module :
- `/components/StatsView.tsx` : Tableau de bord analytique interactif avec cartes d'indicateurs de performance clés (KPIs) et visualisations graphiques.
- `/components/BenchmarkModal.tsx` : Fenêtre d'analyse comparative détaillée positionnant l'efficacité du cabinet face aux standards du secteur.
- `/lib/benchmark-engine.ts` : Moteur de calcul statistique modélisant les percentiles de performance, les taux d'effort et les ratios de conformité.

---

## 3. Historique d'Évolution & Avancements Récents

- **Phase 1 :** Création des KPIs de base (nombre de tâches ouvertes, terminées, en retard).
- **Phase 2 :** Implémentation du moteur `benchmark-engine.ts` intégrant des seuils de référence empiriques (délai moyen de revue < 48h, taux de conformité cible > 95%).
- **Phase 3 :** Ajout des filtres transversaux par département permettant d'isoler la performance du pôle Conseil Fiscal de celle du Contentieux Juridique.
- **Phase 4 :** Intégration du bouton d'export de rapport exécutif directement depuis le tableau de bord de statistiques.

---

## 4. ⚠️ Dettes Techniques & Points d'Attention Identifiés

### DT-STA-01 : Calculs analytiques synchrones sur le thread principal
- **Description :** Dans `StatsView.tsx`, les calculs de répartition et d'agrégation statistique sont effectués directement dans le cycle de rendu du composant React.
- **Cause racine :** Volumétrie initiale modérée rendant l'exécution instantanée sur des jeux de données d'essai (< 500 éléments).
- **Impact :** Possibilité de micro-ralentissement lors du basculement rapide d'onglets si la base de données compte plusieurs milliers d'entrées historiques.
- **Plan de remédiation :** 
  1. Envelopper les calculs dans des hooks `useMemo` rigoureusement typés.
  2. Pour les calculs complexes de percentiles du benchmark, déporter l'exécution dans un Web Worker non bloquant.

### DT-STA-02 : Référentiels de benchmark statiques en dur dans le code
- **Description :** Les cibles de référence (ex: temps de cycle cible de 48 heures, ratio d'effort par liasse fiscale) sont actuellement codées en dur sous forme de constantes dans `lib/benchmark-engine.ts`.
- **Cause racine :** Absence d'un écran de configuration d'administration permettant de modifier les seuils sectoriels selon les spécificités propres à chaque cabinet.
- **Impact :** Nécessité de modifier le code TypeScript et de redéployer l'application pour ajuster les objectifs d'efficacité du cabinet.
- **Plan de remédiation :** Déplacer ces seuils de référence dans la table de configuration système en base PostgreSQL avec interface de gestion dédiée dans `AdminView.tsx`.

### DT-STA-03 : Absence de vues matérialisées SQL pour les analyses historiques
- **Description :** Les requêtes d'agrégation interrogent la table brute des tâches sans passer par des vues matérialisées PostgreSQL ou des tables de fait OLAP.
- **Cause racine :** Architecture hybride avec persistance locale réactive privilégiant la souplesse.
- **Impact :** Montée en charge limitée si le volume de données historiques atteint 50 000 tâches après plusieurs années d'exploitation.
- **Plan de remédiation :** Créer une table de synthèse périodique `kpi_daily_snapshots` alimentée par un trigger de fin de journée.
