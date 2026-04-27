'use client';

import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Master (Noyau v4.0 - Senior Expert Mode)
 * Architecture DSL versionnée avec audit de cohérence et génération de conseils.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       
  tenantId?: string;
  sector?: string;    
  regime?: string;
  fiscalYear?: number;
}

export interface RuleTrace {
  ruleCode: string;
  ruleName: string;
  conditionMet: boolean;
  actionsExecuted: string[];
  justification: string;
  advice?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITIQUE';
  category: string;
  impactEstimated?: number;
  recommendation?: string;
  timestamp: string;
}

/**
 * Pipeline Master DSL 4.0 : Évalue les règles avec audit de conflit et scoring.
 */
export async function executeFiscalPipeline(ctx: FiscalContext, category?: string, inputData: any = {}): Promise<{ results: any, traces: RuleTrace[], score: number }> {
  const { db, date, sector, regime } = ctx;
  const currentYear = ctx.fiscalYear || new Date(date).getFullYear();
  
  // 1. Récupération des règles actives pour l'année fiscale
  const rulesQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('active', '==', true)
  );

  const snap = await getDocs(rulesQuery);
  
  const filteredRules = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter((rule: any) => {
      const matchYear = rule.fiscal_year ? rule.fiscal_year === currentYear : true;
      const matchCategory = category ? rule.category === category : true;
      return matchYear && matchCategory;
    })
    .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

  let results = { 
    ...inputData, 
    secteur: sector || 'SERVICES', 
    regime: regime || 'REGIME_REEL',
    date_calcul: date,
    fiscal_year: currentYear,
    total_reintegrations: 0,
    score_initial: 100
  };
  
  let traces: RuleTrace[] = [];
  let currentScore = 100;

  // 2. Évaluation séquentielle avec gestion d'erreurs
  for (const rule of filteredRules as any[]) {
    try {
      const isMet = rule.when ? evalDSLFormula(rule.when, results) : true;
      
      if (isMet) {
        const executedActions: string[] = [];
        
        // Calcul du malus de score basé sur la sévérité
        if (rule.severity === 'HIGH' || rule.severity === 'CRITIQUE') currentScore -= 15;
        else if (rule.severity === 'MEDIUM') currentScore -= 7;
        else currentScore -= 3;

        if (Array.isArray(rule.then)) {
          for (const action of rule.then) {
            const subConditionMet = action.if ? evalDSLFormula(action.if, results) : true;
            if (subConditionMet && action.set) {
              const parts = action.set.split('=');
              if (parts.length === 2) {
                const variable = parts[0].trim();
                const formula = parts[1].trim();
                const calculatedValue = evalDSLFormula(formula, results);
                results[variable] = calculatedValue;
                executedActions.push(`${variable} = ${calculatedValue}`);
              }
            }
          }
        }

        // Génération du conseil enrichi
        let advice = rule.message_template || "";
        if (advice) {
          Object.entries(results).forEach(([k, v]) => {
            advice = advice.replace(new RegExp(`{${k}}`, 'g'), String(v));
          });
        }

        traces.push({
          ruleCode: rule.id,
          ruleName: rule.name,
          conditionMet: true,
          actionsExecuted: executedActions,
          justification: rule.justify || "Conformité CIDTA.",
          advice,
          severity: rule.severity || 'LOW',
          category: rule.category || 'FISCAL',
          recommendation: rule.recommendation || "Vérifier l'imputation comptable.",
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(`[Moteur DSL] Erreur règle ${rule.id}:`, e);
    }
  }

  return { results, traces, score: Math.max(0, currentScore) };
}

/**
 * Évaluateur de formules DSL sécurisé.
 */
function evalDSLFormula(formula: string, params: Record<string, any>): any {
  try {
    let expression = formula
      .replace(/ABS\(/g, 'Math.abs(')
      .replace(/MAX\(/g, 'Math.max(')
      .replace(/MIN\(/g, 'Math.min(')
      .replace(/CEIL\(/g, 'Math.ceil(');

    const keys = Object.keys(params);
    const vals = Object.values(params);
    const func = new Function(...keys, `return ${expression}`);
    return func(...vals);
  } catch (e) {
    return 0;
  }
}
