
/**
 * @fileOverview Référentiel des Prompts SEAD (System Expert for Decision Support)
 * Ce fichier centralise les templates de prompts industrialisables pour l'ERP ComptaFisc-DZ.
 */

export const SEAD_PROMPTS = {
  /**
   * 1. PROMPT CENTRAL — MOTEUR DE DÉCISION FISCALE (CORE)
   */
  FISCAL_DECISION_CORE: `
CONTEXTE :
Vous êtes un système expert fiscal algérien intégré dans un ERP. Vous devez fournir une recommandation prescriptive basée uniquement sur des règles métier, des modèles mathématiques et des contraintes légales.

INPUT STRUCTURÉ :
Chiffre d’affaires : {{ca}}
Charges : {{charges}}
Résultat brut : {{resultat}}
Trésorerie : {{cash}}
TVA collectée : {{tva_collectee}}
TVA déductible : {{tva_deductible}}
Investissements : {{investissements}}
Secteur : {{secteur}}
Statut fiscal : {{statut}}

OBJECTIFS :
1. Minimiser la charge fiscale totale (IBS + TVA)
2. Maintenir une trésorerie positive
3. Respecter toutes les contraintes fiscales algériennes

CONTRAINTES :
- Respect plafonds légaux
- Respect déductibilité fiscale
- Respect obligations déclaratives

TÂCHES :
1. Identifier les leviers d’optimisation
2. Calculer les impacts chiffrés
3. Générer 3 scénarios :
   - Conservateur (Sécurité maximale)
   - Optimisé (Équilibre performance/risque)
   - Agressif (Optimisation maximale dans le cadre légal)
4. Expliquer chaque recommandation

FORMAT DE SORTIE :
- Résumé exécutif
- Liste des décisions recommandées
- Impact financier estimé
- Niveau de risque
- Justification logique
`,

  /**
   * 2. PROMPT “WHAT-IF” (SIMULATION)
   */
  WHAT_IF_SIMULATION: `
CONTEXTE :
Simulateur décisionnel fiscal et financier pour dirigeant algérien.

INPUT :
Variable à tester : {{variable}}
Variation : {{variation}}
Données actuelles : {{data}}

TÂCHE :
Simuler l’impact de la variation et recalculer :
- Résultat prévisionnel
- Impôt induit
- Impact Trésorerie
Comparer l'état avant / après et identifier les seuils critiques de rentabilité.

SORTIE :
- Tableau comparatif
- Impact en %
- Recommandation finale
- Risque associé
`,

  /**
   * 3. PROMPT OPTIMISATION MULTI-CRITÈRES (TYPE AHP / PARETO)
   */
  MULTI_CRITERIA_OPTIM: `
CONTEXTE :
Optimisation multi-critères pour prise de décision stratégique.

CRITÈRES :
- Fiscalité (poids : {{w1}})
- Trésorerie (poids : {{w2}})
- Risque (poids : {{w3}})
- Croissance (poids : {{w4}})

OPTIONS :
{{options}}

TÂCHE :
1. Évaluer chaque option stratégique selon les 4 critères
2. Calculer le score pondéré global
3. Identifier les solutions Pareto optimales
4. Classer les stratégies par pertinence métier

SORTIE :
- Classement des options
- Focus sur la meilleure option
- Alternatives de repli
- Justification par les poids
`,

  /**
   * 4. PROMPT STOCK (EOQ + DÉCISION)
   */
  STOCK_EOQ_DECISION: `
CONTEXTE :
Optimisation de gestion de stock intégrée à l'ERP.

INPUT :
Demande annuelle (D) : {{D}}
Coût unitaire de commande (S) : {{S}}
Coût de stockage par unité (H) : {{H}}

TÂCHE :
1. Calculer la quantité économique de commande (EOQ / Formule de Wilson)
2. Déterminer la fréquence de commande idéale
3. Identifier le risque de rupture basé sur le stock actuel
4. Proposer une stratégie de réapprovisionnement optimale

SORTIE :
- Quantité optimale à commander
- Nombre de commandes annuel
- Coût total de gestion de stock
- Recommandation logistique
`,

  /**
   * 5. PROMPT TRÉSORERIE (OPTIMISATION)
   */
  CASHFLOW_OPTIMIZATION: `
CONTEXTE :
Optimisation de trésorerie court terme (30-60-90 jours).

INPUT :
Encaissements prévus : {{inflows}}
Décaissements prévus (Engagements) : {{outflows}}
Solde actuel en banque : {{cash}}

TÂCHE :
1. Détecter proactivement les tensions de trésorerie (creux)
2. Proposer des arbitrages concrets :
   - Quelles charges reporter sans pénalité majeure ?
   - Quels encaissements accélérer via relance ou escompte ?
3. Minimiser le risque de déficit bancaire

SORTIE :
- Projection de solde à 30 jours
- Actions prioritaires recommandées
- Impact cash flow estimé
`,

  /**
   * 6. PROMPT RÈGLES EXPERTES (FALLBACK SANS IA)
   */
  EXPERT_RULES_FALLBACK: `
CONTEXTE :
Exécution déterministe de règles métier fiscales (Algorithme de conformité).

RÈGLES DU MOTEUR :
{{rules_engine}}

DONNÉES DU DOSSIER :
{{data}}

TÂCHE :
1. Appliquer séquentiellement toutes les règles de conformité
2. Détecter les éventuels conflits ou incohérences
3. Prioriser les décisions selon la gravité fiscale
4. Générer des recommandations basées sur les articles du code

SORTIE :
- Liste des règles déclenchées
- Décisions automatiques suggérées
- Justification logique et légale
`,

  /**
   * 7. PROMPT EXPLICABILITÉ (DIFFÉRENCIATEUR MAJEUR)
   */
  EXPLAINABILITY: `
CONTEXTE :
Vulgarisation et explication d’une décision complexe générée par le système.

INPUT :
Décision suggérée : {{decision}}
Données ayant servi au calcul : {{data}}

TÂCHE :
1. Expliquer de manière pédagogique pourquoi cette décision a été prise
2. Identifier les contraintes légales ou financières qui ont forcé ce choix
3. Présenter un calcul simplifié (preuve par les chiffres)
4. Indiquer les risques résiduels en cas de non-application

SORTIE :
- Explication métier claire
- Les 3 facteurs clés ayant pesé sur la décision
- Analyse de sensibilité simplifiée
`,

  /**
   * 8. PROMPT SCORING ENTREPRISE (SEAD GLOBAL)
   */
  BUSINESS_SCORING: `
CONTEXTE :
Audit global de santé financière et fiscale d’une entité algérienne.

INPUT (Ratios et Données financières) :
{{financials}}

TÂCHE :
1. Calculer les scores de performance sur 100 :
   - Rentabilité d'exploitation
   - Efficience Fiscale (Optimisation vs Charge)
   - Liquidité & Solidité structurelle
2. Identifier les 2 faiblesses critiques
3. Proposer un plan d'actions correctives sur 6 mois

SORTIE :
- Score Global ComptaFisc (0-100)
- Diagnostic synthétique par axe
- Plan d’action stratégique
`
};

export type SeadPromptKey = keyof typeof SEAD_PROMPTS;

/**
 * Utilitaire pour injecter des variables dans un template de prompt.
 * Supporte le format {{variable}}.
 */
export function populatePrompt(template: string, variables: Record<string, string | number>): string {
  let populated = template;
  for (const [key, value] of Object.entries(variables)) {
    populated = populated.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return populated;
}
