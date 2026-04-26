/**
 * @fileOverview Moteur de Calcul (Refactoré v3.1 - Modèle Multi-Activités 2026)
 * Alignement total sur le DSL Paie et Fiscalité par secteur d'activité.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  IBS_NORMAL: 0.26,
  IBS_PRODUCTION: 0.19,
  IBS_SERVICES: 0.23,
  IBS_BTP: 0.23, 
  IRG_DIVIDENDES: 0.10,
  IFU_THRESHOLD: 8000000,
  IFU_AUTO_THRESHOLD: 5000000,
  IFU_MIN_STANDARD: 10000,
  IFU_MIN_AUTO: 10000,
  TAXE_APPRENTISSAGE: 0.01,
  TAXE_FORMATION_CONT: 0.01,
  RETENUE_GARANTIE_BTP: 0.05,
};

export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
  MAX_ABATEMENT_IRG: 12000, 
};

/**
 * Calculateur IRG Salarié - Version DSL 2026
 */
export function calculateIRG(salairePoste: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  const cnasSalariale = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
  const salaireImposable = salairePoste - cnasSalariale;

  let abattement = salaireImposable * 0.40;
  if (abattement > PAYROLL_CONSTANTS.MAX_ABATEMENT_IRG) {
    abattement = PAYROLL_CONSTANTS.MAX_ABATEMENT_IRG;
  }
  const baseIRG = Math.max(0, salaireImposable - abattement);

  let tax = 0;
  if (baseIRG <= 30000) {
    tax = 0;
  } else if (baseIRG <= 120000) {
    tax = (baseIRG - 30000) * 0.20;
  } else if (baseIRG <= 360000) {
    tax = (120000 - 30000) * 0.20 + (baseIRG - 120000) * 0.30;
  } else {
    tax = (120000 - 30000) * 0.20 + (360000 - 120000) * 0.30 + (baseIRG - 360000) * 0.35;
  }

  if (isHandicapped && baseIRG <= 42500) tax = tax * 0.5;
  if (isGrandSud) tax *= 0.5;

  return Math.max(0, Math.round(tax));
}

/**
 * Calculateur TVA par secteur
 */
export function calculateTVA(ht: number, type: 'TVA_19' | 'TVA_9' | 'TVA_EXONERE' = 'TVA_19', sector?: string, isIFU: boolean = false): number {
  if (isIFU || type === 'TVA_EXONERE' || sector === 'AGRICULTURE') return 0;
  const rate = type === 'TVA_9' ? TAX_RATES.TVA_REDUIT : TAX_RATES.TVA_NORMAL;
  return Math.round(ht * rate * 100) / 100;
}

/**
 * Calculateur Retenue de Garantie (BTP)
 */
export function calculateRetenueGarantie(amountHT: number, sector?: string): number {
  if (sector !== 'BTP') return 0;
  return Math.round(amountHT * TAX_RATES.RETENUE_GARANTIE_BTP * 100) / 100;
}

export function calculateIBS(profit: number, rate: number, reinvested: number = 0): number {
  const taxableProfit = Math.max(0, profit - reinvested);
  return Math.round(taxableProfit * rate);
}

export function calculateBFR(stocks: number, receivables: number, payables: number): number {
  return stocks + receivables - payables;
}

export function calculateLiquidityRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0;
  const tax = ca * rate;
  const min = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  return Math.max(min, Math.round(tax));
}

export function getIFURate(secteur: string, formeJuridique: string): number {
  if (formeJuridique === 'Auto-entrepreneur') return 0.005;
  if (secteur === 'PRODUCTION' || secteur === 'COMMERCE') return 0.05;
  return 0.12;
}

export function getIBSRate(secteur: string, activiteNAP?: string): number {
  if (secteur === 'INDUSTRIE' || secteur === 'PRODUCTION') return TAX_RATES.IBS_PRODUCTION;
  if (secteur === 'BTP') return TAX_RATES.IBS_BTP;
  return TAX_RATES.IBS_NORMAL;
}
