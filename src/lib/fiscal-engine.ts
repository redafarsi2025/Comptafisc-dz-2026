
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Expert (Resolution & Evaluation)
 * Gère la récupération dynamique des taux, seuils et l'exécution des règles métier.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       // Date de l'opération (ISO)
  tenantId?: string;  // Dossier spécifique
  sector?: string;    // BTP, INDUSTRIE, etc.
  regime?: string;    // IFU, REGIME_REEL
}

/**
 * Résout une variable fiscale simple (ex: SNMG, TAUX_TVA)
 */
export async function resolveFiscalVariable(ctx: FiscalContext, code: string): Promise<number | any> {
  const { db, date } = ctx;

  // 1. Recherche de la valeur effective
  const valueQuery = query(
    collection(db, 'fiscal_variable_values'),
    where('fiscalVariableTypeId', '==', code),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(valueQuery);
  if (snap.empty) {
    throw new Error(`ERREUR CRITIQUE : Variable fiscale [${code}] non définie pour la date du ${date}.`);
  }

  const val = snap.docs[0].data().value;
  return typeof val === 'string' ? parseFloat(val) : val;
}

/**
 * Résout et exécute une règle fiscale complexe (ex: IRG_SALARY)
 */
export async function evaluateFiscalRule(ctx: FiscalContext, ruleCode: string, inputData: any): Promise<number> {
  const { db, date, sector, regime } = ctx;

  // 1. Charger la règle la plus pertinente (Scope: Global -> Sector -> Regime)
  // Pour le prototype, on simplifie la recherche par priorité
  const ruleQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('code', '==', ruleCode),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(ruleQuery);
  if (snap.empty) {
    throw new Error(`Règle fiscale [${ruleCode}] manquante. Calcul impossible.`);
  }

  const rule = snap.docs[0].data();

  // 2. Évaluation simplifiée des tranches/conditions
  // Dans une version prod, on utiliserait un parser de formule type mathjs
  if (rule.type === 'PROGRESSIVE_BRACKETS') {
    const value = inputData.base || 0;
    const brackets = rule.brackets; // Array de { min, max, rate, reduction }
    
    let result = 0;
    for (const b of brackets) {
      if (value > b.min) {
        const taxableInRange = Math.min(value, b.max || value) - b.min;
        result += taxableInRange * b.rate;
      }
    }
    
    if (rule.abatementFormula) {
      // Application d'un abattement dynamique
      // Exemple simplifié : result = result * 0.6
      result = evalFormula(rule.abatementFormula, { tax: result, base: value });
    }

    return Math.round(result);
  }

  return 0;
}

/**
 * Evaluateur de formule sécurisé (Simplifié pour le prototype)
 */
function evalFormula(formula: string, params: Record<string, number>): number {
  try {
    let f = formula;
    for (const [k, v] of Object.entries(params)) {
      f = f.replace(new RegExp(k, 'g'), v.toString());
    }
    // eslint-disable-next-line no-eval
    return eval(f);
  } catch (e) {
    console.error("Erreur évaluation formule:", formula, e);
    return 0;
  }
}
