
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Master (Noyau v2.6)
 * Optimisation du Pipeline d'Exécution et gestion des dépendances.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       // Date de l'opération (ISO)
  tenantId?: string;  // Dossier spécifique
  sector?: string;    // BTP, INDUSTRIE, COMMERCE, PRO_LIBERALE
  regime?: string;    // IFU, REGIME_REEL
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
  
  if (snap.empty) {
    return 0;
  }

  const data = snap.docs[0].data();
  const val = typeof data.value === 'string' ? parseFloat(data.value) : data.value;
  
  VARIABLE_CACHE[cacheKey] = { value: val, expires: Date.now() + CACHE_TTL };
  return val;
}

/**
 * Pipeline d'Exécution : Évalue une suite de règles dans l'ordre de priorité.
 */
export async function executeFiscalPipeline(ctx: FiscalContext, category?: string, inputData: any = {}): Promise<any> {
  const { db, date } = ctx;
  let constraints = [where('effectiveStartDate', '<=', date)];
  if (category) constraints.push(where('category', '==', category));

  const rulesQuery = query(
    collection(db, 'fiscal_business_rules'),
    ...constraints,
    orderBy('order', 'asc')
  );

  const snap = await getDocs(rulesQuery);
  let results = { ...inputData };

  // Exécution séquentielle pour respecter l'ordre et les dépendances
  for (const doc of snap.docs) {
    const rule = doc.data();
    try {
      const output = await evaluateRuleInternal(rule, results);
      results[rule.code] = output;
    } catch (e) {
      console.error(`[Moteur Fiscal] Échec règle ${rule.code}:`, e);
    }
  }

  return results;
}

/**
 * Évaluation d'une règle unique.
 */
export async function evaluateFiscalRule(ctx: FiscalContext, ruleCode: string, inputData: any): Promise<number> {
  const { db, date } = ctx;

  const ruleQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('code', '==', ruleCode),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(ruleQuery);
  if (snap.empty) throw new Error(`Règle [${ruleCode}] introuvable.`);

  return evaluateRuleInternal(snap.docs[0].data(), inputData);
}

async function evaluateRuleInternal(rule: any, data: any): Promise<number> {
  if (rule.type === 'PROGRESSIVE_BRACKETS') {
    return calculateProgressiveTax(rule, data.base || 0);
  }
  if (rule.type === 'FORMULA') {
    return evalDSLFormula(rule.formula, data);
  }
  return 0;
}

function calculateProgressiveTax(rule: any, base: number): number {
  const amount = Math.floor(base / 10) * 10;
  let tax = 0;

  if (rule.brackets) {
    for (const b of rule.brackets) {
      if (amount > b.min) {
        const range = (b.max ? Math.min(amount, b.max) : amount) - b.min;
        tax += range * (b.rate || 0);
      }
    }
  }

  if (rule.abatementFormula) {
    const abatement = evalDSLFormula(rule.abatementFormula, { tax, base: amount });
    tax = Math.max(0, tax - abatement);
  }

  if (rule.smoothingEnabled && amount > rule.smoothingThreshold && amount <= (rule.smoothingThreshold + 5000)) {
    tax = tax * (137/51) - (27925/8);
  }

  return Math.max(0, Math.round(tax));
}

function evalDSLFormula(formula: string, params: Record<string, any>): number {
  try {
    const keys = Object.keys(params);
    const vals = Object.values(params);
    const func = new Function(...keys, `return ${formula}`);
    const res = func(...vals);
    return typeof res === 'number' ? res : 0;
  } catch (e) {
    console.error("[Moteur Fiscal] DSL Error:", formula, e);
    return 0;
  }
}
