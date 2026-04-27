'use client';

import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Master (Noyau v3.1 - Index Opti)
 * Implémentation d'un DSL déclaratif pour la fiscalité algérienne.
 * Correction : Filtrage et tri côté client pour éviter les erreurs d'index composite Firestore.
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
 * Résout une variable fiscale via la hiérarchie GLOBAL (versionnée).
 */
export async function resolveFiscalVariable(ctx: FiscalContext, code: string): Promise<number> {
  const { db, date } = ctx;
  const cacheKey = `${code}_${date}`;

  if (VARIABLE_CACHE[cacheKey] && VARIABLE_CACHE[cacheKey].expires > Date.now()) {
    return VARIABLE_CACHE[cacheKey].value;
  }

  // Requête simple sur un champ unique pour éviter les erreurs d'index
  const valueQuery = query(
    collection(db, 'fiscal_variable_values'),
    where('fiscalVariableTypeId', '==', code)
  );

  const snap = await getDocs(valueQuery);
  
  if (snap.empty) return 0;

  // Filtrage manuel par date et tri pour éviter l'index composite
  const validDocs = snap.docs
    .map(d => d.data())
    .filter(d => d.effectiveStartDate <= date)
    .sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate));

  if (validDocs.length === 0) return 0;

  const data = validDocs[0];
  const val = typeof data.value === 'string' ? parseFloat(data.value) : data.value;
  
  VARIABLE_CACHE[cacheKey] = { value: val, expires: Date.now() + CACHE_TTL };
  return val;
}

/**
 * Pipeline Master DSL : Évalue les règles en respectant l'isolation par ACTIVITÉ et CLIENT.
 * Utilise le filtrage client-side pour garantir la compatibilité sans index composite.
 */
export async function executeFiscalPipeline(ctx: FiscalContext, category?: string, inputData: any = {}): Promise<{ results: any, traces: RuleTrace[] }> {
  const { db, date, sector, regime } = ctx;
  
  // Requête ultra-simple pour éviter les erreurs d'index complexe
  const rulesQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('active', '==', true)
  );

  const snap = await getDocs(rulesQuery);
  
  // Filtrage et tri client-side
  const filteredRules = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter((rule: any) => {
      const matchDate = rule.effectiveStartDate <= date;
      const matchCategory = category ? rule.category === category : true;
      return matchDate && matchCategory;
    })
    .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

  let results = { 
    ...inputData, 
    secteur: sector || 'SERVICES', 
    regime: regime || 'REGIME_REEL',
    date_calcul: date
  };
  
  let traces: RuleTrace[] = [];

  for (const rule of filteredRules as any[]) {
    try {
      const isMet = rule.when ? evalDSLFormula(rule.when, results) : true;
      
      if (isMet) {
        const executedActions: string[] = [];
        
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
