
# Stratégie SEAD (System Expert for Decision Support) - ComptaFisc-DZ

Ce document définit la vision du moteur d'aide à la décision de l'ERP.

## 🚀 Vision
ComptaFisc-DZ ne doit pas être qu'un miroir comptable, mais un **guide stratégique**. 
Le moteur SEAD transforme les données froides (écritures, taxes) en **actions chaudes** (optimisations, alertes).

## 🛠 Architecture Hybride
Le système fonctionne selon deux modes :

1. **Mode IA (LLM)** : Utilise les prompts stockés dans `src/lib/sead-prompts.ts` pour générer des analyses contextuelles riches via Gemini.
2. **Mode Déterministe (Fallback)** : Utilise le moteur de règles métier (`src/lib/fiscal-engine.ts`) et des modèles mathématiques (EOQ, Analyse Financière) pour fournir des recommandations garanties et auditables même sans connexion IA.

## 📂 Contenu du Référentiel
Les prompts industrialisés couvrent :
- **FISCAL_DECISION_CORE** : Optimisation IBS/TVA (Moteur central).
- **WHAT_IF_SIMULATION** : Simulation d'impact avant investissement.
- **MULTI_CRITERIA_OPTIM** : Arbitrage entre croissance, risque et cash.
- **STOCK_EOQ_DECISION** : Economic Order Quantity pour les stocks.
- **CASHFLOW_OPTIMIZATION** : Détection prédictive de faillite technique.
- **EXPLAINABILITY** : Traduction des décisions complexes en langage métier simple.

## 📈 Intégration Logicielle
Les prompts sont accessibles via le service `getSeadRecommendation` défini dans `src/ai/flows/sead-decision-flow.ts`.

Exemple d'appel :
```typescript
const plan = await getSeadRecommendation({
  promptKey: 'FISCAL_DECISION_CORE',
  variables: { ca: 1500000, cash: 500000, ... }
});
```

## 🎯 Objectif Commercial
Vendre la **tranquillité d'esprit** et la **performance** plutôt que la simple saisie comptable. Le SEAD devient le différenciateur majeur de ComptaFisc-DZ sur le marché algérien.
