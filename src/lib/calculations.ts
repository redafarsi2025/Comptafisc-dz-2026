
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
 * Supporte le paramétrage spécifique du client (5% ou 10%).
 */
export function calculateRetenueGarantie(amount: number, sector: string = 'BTP', overrideRate?: number): number {
  if (sector !== 'BTP') return 0;
  const rate = overrideRate !== undefined ? (overrideRate / 100) : DEFAULTS_2026.RETENUE_BTP;
  return Math.round(amount * rate);
}

/**
 * Calcule la TVA selon le régime et le taux.
 */
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = rateCode === 'TVA_9' ? DEFAULTS_2026.TVA_RED : DEFAULTS_2026.TVA_STD;
  return Math.round(amount * rate);
}

/**
 * Calcule l'IFU (Impôt Forfaitaire Unique).
 */
export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0; 
  const minTax = 10000;
  const calculated = ca * rate;
  return Math.max(minTax, Math.round(calculated));
}

/**
 * Calcule l'IBS (Impôt sur les Bénéfices des Sociétés).
 * Intègre les exonérations spécifiques (Startup, ANADE).
 */
export function calculateIBS(profit: number, rate: number, reinvestedAmount: number = 0, isExempt: boolean = false): number {
  if (isExempt || profit <= 0) return 0;
  const baseImposable = Math.max(0, profit - reinvestedAmount);
  return Math.round(baseImposable * rate);
}

/**
 * Calcule l'IRG (Impôt sur le Revenu Global) Traitements et Salaires.
 * Supporte l'abattement spécifique Zone Sud et Handicapé.
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

  // Lissage pour tranches spécifiques LF 2026
  if (isHandicapped && baseIRG <= 42500) tax *= 0.5;
  if (isGrandSud) tax *= 0.5;

  return Math.round(tax);
}

/**
 * Calcule l'assiette annuelle pour le versement CASNOS.
 */
export const CASNOS_CONSTANTS = {
  MIN_AMOUNT: 32400,
  MAX_AMOUNT: 324000,
  BASE_RATE: 0.15
};

export function calculateCASNOS(annualBase: number): number {
  const calculated = annualBase * CASNOS_CONSTANTS.BASE_RATE;
  if (calculated < CASNOS_CONSTANTS.MIN_AMOUNT) return CASNOS_CONSTANTS.MIN_AMOUNT;
  if (calculated > CASNOS_CONSTANTS.MAX_AMOUNT) return CASNOS_CONSTANTS.MAX_AMOUNT;
  return Math.round(calculated);
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

export function getIFURate(sector: string, forme: string): number {
  if (forme === "Auto-entrepreneur") return 0.005; 
  if (sector === "PRODUCTION") return 0.05;
  return 0.12; 
}

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

export const TAX_RATES = {
  IFU_THRESHOLD: 8000000,
  IFU_AUTO_THRESHOLD: 5000000,
  IFU_MIN_STANDARD: 10000,
  IFU_MIN_AUTO: 10000,
  TAXE_APPRENTISSAGE: 0.01,
  TAXE_FORMATION_CONT: 0.01
};
