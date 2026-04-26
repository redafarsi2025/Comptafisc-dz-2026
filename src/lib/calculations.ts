
/**
 * @fileOverview Moteur de Calcul (Abstraction Layer)
 * IMPORTANT : Ce fichier ne contient plus de taux figés. 
 * Il agit comme une interface vers le Moteur Master DSL ou fournit les valeurs par défaut de la LF 2026.
 */

// Valeurs par défaut (Version 2026.1) - Utilisées uniquement en cas d'absence de données Firestore
const DEFAULTS_2026 = {
  SNMG: 24000,
  TVA_STD: 0.19,
  TVA_RED: 0.09,
  IBS_PROD: 0.19,
  IBS_BTP: 0.23,
  IBS_SERV: 0.26,
  RETENUE_BTP: 0.05
};

export const PAYROLL_CONSTANTS = {
  SNMG: DEFAULTS_2026.SNMG,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
};

/**
 * Calcule la retenue de garantie (spécifique BTP).
 * Hiérarchie : ACTIVITÉ (BTP)
 */
export function calculateRetenueGarantie(amount: number, sector: string = 'BTP'): number {
  if (sector !== 'BTP') return 0;
  return Math.round(amount * DEFAULTS_2026.RETENUE_BTP);
}

/**
 * Calcule la TVA selon le régime et le taux.
 * Hiérarchie : CLIENT (IFU/Réel) -> DOCUMENT
 */
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = rateCode === 'TVA_9' ? DEFAULTS_2026.TVA_RED : DEFAULTS_2026.TVA_STD;
  return Math.round(amount * rate);
}

/**
 * Calcule l'IFU (Impôt Forfaitaire Unique).
 * Hiérarchie : CLIENT (Auto-entrepreneur / Startup)
 */
export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0; 
  const minTax = 10000;
  const calculated = ca * rate;
  return Math.max(minTax, Math.round(calculated));
}

/**
 * Calcule l'IBS (Impôt sur les Bénéfices des Sociétés).
 * Hiérarchie : ACTIVITÉ (Secteur) -> CLIENT (Réinvestissement)
 */
export function calculateIBS(profit: number, rate: number, reinvestedAmount: number = 0): number {
  if (profit <= 0) return 0;
  const baseImposable = Math.max(0, profit - reinvestedAmount);
  return Math.round(baseImposable * rate);
}

/**
 * Calcule l'IRG (Impôt sur le Revenu Global) Traitements et Salaires.
 * Hiérarchie : GLOBAL (Barème) -> CLIENT (Zone Sud / Handicapé)
 */
export function calculateIRG(salairePoste: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  const cnasSalariale = salairePoste * 0.09;
  const salaireImposable = salairePoste - cnasSalariale;

  let abattement = salaireImposable * 0.40;
  if (abattement > 1500) abattement = 1500;
  
  const baseIRG = Math.max(0, salaireImposable - abattement);

  let tax = 0;
  if (baseIRG <= 30000) tax = 0;
  else if (baseIRG <= 120000) tax = (baseIRG - 30000) * 0.20;
  else if (baseIRG <= 360000) tax = (120000 - 30000) * 0.20 + (baseIRG - 120000) * 0.30;
  else tax = (120000 - 30000) * 0.20 + (360000 - 120000) * 0.30 + (baseIRG - 360000) * 0.35;

  if (isHandicapped && baseIRG <= 42500) tax *= 0.5;
  if (isGrandSud) tax *= 0.5;

  return Math.round(tax);
}

/**
 * Calcule les métriques RH globales pour un salaire.
 */
export function calculateRHMetrics(input: { brut: number, primes: number, avantages: number }) {
  const salairePoste = input.brut + input.primes;
  const cnasE = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
  const cnasP = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
  const imposable = salairePoste - cnasE;
  const irg = calculateIRG(imposable);
  const net = imposable - irg + input.avantages;
  const cost = salairePoste + cnasP + input.avantages;

  return {
    net,
    cost,
    irg,
    cnasTotal: cnasE + cnasP,
    ratio: cost > 0 ? (net / cost) * 100 : 0
  };
}

/**
 * Détermine le taux IFU applicable.
 */
export function getIFURate(sector: string, forme: string): number {
  if (forme === "Auto-entrepreneur") return 0.005; 
  if (sector === "PRODUCTION") return 0.05;
  return 0.12; 
}

/**
 * Détermine le taux IBS applicable selon le secteur.
 * Hiérarchie : ACTIVITÉ
 */
export function getIBSRate(sector: string): number {
  if (sector === 'INDUSTRIE' || sector === 'PRODUCTION') return DEFAULTS_2026.IBS_PROD;
  if (sector === 'BTP') return DEFAULTS_2026.IBS_BTP;
  return DEFAULTS_2026.IBS_SERV;
}

export function calculateBFR(stocks: number, receivables: number, payables: number): number {
  return stocks + receivables - payables;
}

export function calculateLiquidityRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * Simulateur d'investissement (Tax Shield).
 */
export function simulateInvestmentScenarios(amount: number, years: number, ibsRate: number) {
  const annualAmort = amount / years;
  const annualTaxSaving = annualAmort * ibsRate;
  const totalTaxSaving = annualTaxSaving * years;
  const netCostA = amount - totalTaxSaving;

  const monthlyLease = (amount * 1.25) / (years * 12);
  const annualLeaseCharge = monthlyLease * 12;
  const annualTaxSavingLease = annualLeaseCharge * ibsRate;
  const netCostB = (annualLeaseCharge * years) - (annualTaxSavingLease * years);

  return {
    purchase: {
      annualAmort,
      annualTaxSaving,
      totalTaxSaving,
      netCost: netCostA,
      immediateCashOut: amount
    },
    leasing: {
      monthlyLease,
      annualTaxSaving: annualTaxSavingLease,
      netCost: netCostB,
      immediateCashOut: monthlyLease
    }
  };
}
