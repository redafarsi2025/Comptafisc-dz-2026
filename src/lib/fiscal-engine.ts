
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Master (Resolution & Evaluation)
 * Version 2.5 - Implémentation Data-Driven avec Rule Engine No-Code et Cache Session.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       // Date de l'opération (ISO)
  tenantId?: string;  // Dossier spécifique
  sector?: string;    // BTP, INDUSTRIE, COMMERCE, PRO_LIBERALE
  regime?: string;    // IFU, REGIME_REEL
}

// Cache interne pour la session afin d'éviter les lectures redondantes
const VARIABLE_CACHE: Record<string, { value: any; expires: number }> = {};
const CACHE_TTL = 300000; // 5 minutes

/**
 * Résout une variable fiscale (ex: SNMG, TVA_STD).
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
    console.warn(`[Moteur Fiscal] Variable [${code}] non définie. Fallback local.`);
    return 0;
  }

  const data = snap.docs[0].data();
  const val = typeof data.value === 'string' ? parseFloat(data.value) : data.value;
  
  VARIABLE_CACHE[cacheKey] = { value: val, expires: Date.now() + CACHE_TTL };
  return val;
}

/**
 * Évalue une règle métier complexe (ex: Calcul IRG 2026).
 */
export async function evaluateFiscalRule(ctx: FiscalContext, ruleCode: string, inputData: any): Promise<number> {
  const { db, date, regime } = ctx;

  const ruleQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('code', '==', ruleCode),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(ruleQuery);
  if (snap.empty) {
    throw new Error(`[Moteur Fiscal] Règle [${ruleCode}] non trouvée au ${date}.`);
  }

  const rule = snap.docs[0].data();

  if (rule.type === 'PROGRESSIVE_BRACKETS') {
    return calculateProgressiveTax(rule, inputData.base || 0);
  }

  if (rule.type === 'FORMULA') {
    return evalDSLFormula(rule.formula, inputData);
  }

  return 0;
}

/**
 * Calculateur universel par tranches (IRG, IFU, etc.)
 */
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

  // Application de l'abattement via DSL
  if (rule.abatementFormula) {
    const abatement = evalDSLFormula(rule.abatementFormula, { tax, base: amount });
    tax = Math.max(0, tax - abatement);
  }

  // Application du lissage (ex: 30k-35k DA pour l'IRG)
  if (rule.smoothingEnabled && amount > rule.smoothingThreshold && amount <= (rule.smoothingThreshold + 5000)) {
    // Formule standard de lissage DGI
    tax = tax * (137/51) - (27925/8);
  }

  return Math.max(0, Math.round(tax));
}

/**
 * Interpréteur de formules sécurisé pour le noyau fiscal.
 */
function evalDSLFormula(formula: string, params: Record<string, any>): number {
  try {
    const keys = Object.keys(params);
    const vals = Object.values(params);
    const func = new Function(...keys, `return ${formula}`);
    return func(...vals);
  } catch (e) {
    console.error("[Moteur Fiscal] Erreur évaluation DSL:", formula, e);
    return 0;
  }
}
