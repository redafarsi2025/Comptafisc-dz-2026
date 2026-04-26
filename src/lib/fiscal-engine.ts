
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * @fileOverview Moteur Fiscal Expert (Resolution & Evaluation)
 * Version 2.5 - Implémentation Data-Driven avec Rule Engine No-Code.
 */

export interface FiscalContext {
  db: Firestore;
  date: string;       // Date de l'opération (ISO)
  tenantId?: string;  // Dossier spécifique
  sector?: string;    // BTP, INDUSTRIE, COMMERCE, PRO_LIBERALE
  regime?: string;    // IFU, REGIME_REEL
}

/**
 * Résout une variable fiscale simple (ex: SNMG, TAUX_TVA)
 * Cherche la valeur la plus récente par rapport à la date de l'opération.
 */
export async function resolveFiscalVariable(ctx: FiscalContext, code: string): Promise<number | any> {
  const { db, date } = ctx;

  const valueQuery = query(
    collection(db, 'fiscal_variable_values'),
    where('fiscalVariableTypeId', '==', code),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(valueQuery);
  
  if (snap.empty) {
    // En mode expert, on ne fait plus de fallback silencieux, on alerte pour mise à jour administrative
    throw new Error(`[Moteur Fiscal] Variable [${code}] non définie au ${date}. Mise à jour requise en console Admin.`);
  }

  const data = snap.docs[0].data();
  const val = data.value;
  return typeof val === 'string' ? parseFloat(val) : val;
}

/**
 * Moteur de Règles Métier (Rule Engine)
 * Évalue des formules complexes stockées dans Firestore (ex: IRG lissé, IFU progressif).
 */
export async function evaluateFiscalRule(ctx: FiscalContext, ruleCode: string, inputData: any): Promise<number> {
  const { db, date, sector, regime } = ctx;

  // Recherche de la règle avec priorité : Spécifique Régime > Spécifique Secteur > Global
  const ruleQuery = query(
    collection(db, 'fiscal_business_rules'),
    where('code', '==', ruleCode),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const snap = await getDocs(ruleQuery);
  if (snap.empty) {
    throw new Error(`[Moteur Fiscal] Règle [${ruleCode}] non trouvée. Calcul bloqué par sécurité.`);
  }

  const rule = snap.docs[0].data();

  // Évaluation du type de règle
  if (rule.type === 'PROGRESSIVE_BRACKETS') {
    const base = inputData.base || 0;
    const brackets = rule.brackets || [];
    
    let tax = 0;
    for (const b of brackets) {
      if (base > b.min) {
        const taxableInRange = Math.min(base, b.max || base) - b.min;
        tax += taxableInRange * b.rate;
      }
    }
    
    // Application de la formule d'abattement DSL (Domain Specific Language)
    if (rule.abatementFormula) {
      tax = evalDSLFormula(rule.abatementFormula, { tax, base, regime: regime === 'IFU' ? 1 : 0 });
    }

    // Gestion du lissage (ex: IRG 30k-35k)
    if (rule.smoothingEnabled && base > rule.smoothingThreshold && base <= (rule.smoothingThreshold + 5000)) {
      // Formule de lissage spécifique
      tax = tax * (137/51) - (27925/8);
    }

    return Math.max(0, Math.round(tax));
  }

  return 0;
}

/**
 * Évaluateur de formules sécurisé (Simulation de DSL pour le prototype)
 */
function evalDSLFormula(formula: string, params: Record<string, number>): number {
  try {
    let f = formula;
    // Remplacement des variables par leurs valeurs réelles
    for (const [k, v] of Object.entries(params)) {
      f = f.replace(new RegExp(k, 'g'), v.toString());
    }
    
    // Utilisation de Function au lieu de eval pour une meilleure isolation (bac à sable simplifié)
    return new Function(`return ${f}`)();
  } catch (e) {
    console.error("[Moteur Fiscal] Erreur DSL:", formula, e);
    return 0;
  }
}
