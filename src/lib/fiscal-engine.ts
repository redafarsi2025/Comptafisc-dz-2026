'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Master (Noyau v3.0 - Pro DSL Edition)
 * Implémentation d'un DSL déclaratif pour la fiscalité algérienne.
 * Supporte les conditions complexes, les modèles sectoriels et l'audit trail.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       
  tenantId?: string;
  sector?: string;    
  regime?: string;    
}

export interface RuleTrace {
  ruleCode: string;
  ruleName: string;
  conditionMet: boolean;
  actionsExecuted: string[];
  justification: string;
  timestamp: string;
}

const VARIABLE_CACHE: Record<string, { value: any; expires: number }> = {};
const CACHE_TTL = 300000; 

/**
 * Résout une variable fiscale avec cache intelligent.
 */
export async function resolveFiscalVariable(ctx: FiscalContext, code: string): Promise<number> {
  const { db, date } = ctx;
  const cacheKey = `${code}_${date}`;

  if (VARIABLE_CACHE[cacheKey] && VARIABLE_CACHE[cacheKey].expires > Date.now()) {
    return VARIABLE_CACHE[cacheKey].value;
  }

  const valueQuery = query(
    collection(db, 'fiscal_variable_values'),
    where('fiscalVariableTypeId', '==', code),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(valueQuery);
  
  if (snap.empty) return 0;

  const data = snap.docs[0].data();
  const val = typeof data.value === 'string' ? parseFloat(data.value) : data.value;
  
  VARIABLE_CACHE[cacheKey] = { value: val, expires: Date.now() + CACHE_TTL };
  return val;
}

/**
 * Pipeline d'Exécution DSL : Évalue une suite de règles déclaratives.
 * C'est le coeur "vivant" de l'intelligence de l'ERP.
 */
export async function executeFiscalPipeline(ctx: FiscalContext, category?: string, inputData: any = {}): Promise<{ results: any, traces: RuleTrace[] }> {
  const { db, date } = ctx;
  let constraints = [where('effectiveStartDate', '<=', date), where('active', '==', true)];
  if (category) constraints.push(where('category', '==', category));

  const rulesQuery = query(
    collection(db, 'fiscal_business_rules'),
    ...constraints,
    orderBy('priority', 'asc')
  );

  const snap = await getDocs(rulesQuery);
  let results = { ...inputData };
  let traces: RuleTrace[] = [];

  for (const doc of snap.docs) {
    const rule = doc.data();
    try {
      // 1. Évaluation de la condition WHEN
      const isMet = rule.when ? evalDSLFormula(rule.when, results) : true;
      
      if (isMet) {
        const executedActions: string[] = [];
        
        // 2. Exécution des actions THEN conditionnelles
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
        } else if (rule.formula) { 
          const val = evalDSLFormula(rule.formula, results);
          results[rule.code] = val;
          executedActions.push(`${rule.code} = ${val}`);
        }

        // 3. Log de la trace d'audit pour le "Digital Twin"
        traces.push({
          ruleCode: rule.code,
          ruleName: rule.name,
          conditionMet: true,
          actionsExecuted: executedActions,
          justification: rule.justify || "Calcul automatique par le moteur DSL.",
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(`[Moteur DSL] Erreur sur règle ${rule.code}:`, e);
    }
  }

  return { results, traces };
}

/**
 * Interpréteur d'expressions métier.
 */
function evalDSLFormula(formula: string, params: Record<string, any>): any {
  try {
    let expression = formula
      .replace(/ABS\(/g, 'Math.abs(')
      .replace(/MAX\(/g, 'Math.max(')
      .replace(/MIN\(/g, 'Math.min(');

    const keys = Object.keys(params);
    const vals = Object.values(params);
    const func = new Function(...keys, `return ${expression}`);
    return func(...vals);
  } catch (e) {
    return 0;
  }
}
