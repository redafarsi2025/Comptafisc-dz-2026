/**
 * @fileOverview Moteur de Calcul Financier (v4.0 Pro)
 * Modèles prédictifs et simulations de rentabilité conformes à la législation algérienne.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  IBS_NORMAL: 0.26,
  IBS_PRODUCTION: 0.19,
  IBS_SERVICES: 0.23,
  IBS_BTP: 0.23,
  IFU_THRESHOLD: 8000000,
  IFU_AUTO_THRESHOLD: 5000000,
  IFU_MIN_STANDARD: 10000,
  IFU_MIN_AUTO: 10000,
  RETENUE_GARANTIE_BTP: 0.05,
  TAXE_APPRENTISSAGE: 0.01,
  TAXE_FORMATION_CONT: 0.01,
};

export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
};

/**
 * Calcule la retenue de garantie (spécifique BTP).
 */
export function calculateRetenueGarantie(amount: number, sector: string = 'BTP'): number {
  if (sector !== 'BTP') return 0;
  return Math.round(amount * TAX_RATES.RETENUE_GARANTIE_BTP);
}

/**
 * Calcule la TVA selon le régime et le taux.
 */
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0; // Les contribuables IFU ne collectent pas de TVA en principe
  const rate = rateCode === 'TVA_9' ? TAX_RATES.TVA_REDUIT : TAX_RATES.TVA_NORMAL;
  return Math.round(amount * rate);
}

/**
 * Calcule l'IFU (Impôt Forfaitaire Unique).
 */
export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0; // Exonération Startup (Art 100 LF 2026)
  const minTax = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  const calculated = ca * rate;
  return Math.max(minTax, Math.round(calculated));
}

/**
 * Calcule l'IBS (Impôt sur les Bénéfices des Sociétés).
 */
export function calculateIBS(profit: number, rate: number, reinvestedAmount: number = 0): number {
  if (profit <= 0) return 0;
  // Le réinvestissement peut réduire la base imposable ou le taux selon la loi
  const baseImposable = Math.max(0, profit - reinvestedAmount);
  return Math.round(baseImposable * rate);
}

/**
 * Calcule l'IRG (Impôt sur le Revenu Global) Traitements et Salaires.
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
  if (forme === "Auto-entrepreneur") return 0.005; // 0.5% (LF 2024)
  if (sector === "PRODUCTION") return 0.05;
  return 0.12; // Services / Professions libérales
}

/**
 * Détermine le taux TAP (Toujours 0% depuis 2024).
 */
export function getTAPRate(sector: string): number {
  return 0;
}

/**
 * Détermine le taux IBS applicable.
 */
export function getIBSRate(sector: string, nap?: string): number {
  if (sector === 'INDUSTRIE' || sector === 'PRODUCTION') return TAX_RATES.IBS_PRODUCTION;
  if (sector === 'BTP') return TAX_RATES.IBS_BTP;
  return TAX_RATES.IBS_NORMAL;
}

/**
 * Analyse du Besoin en Fonds de Roulement (BFR).
 */
export function calculateBFR(stocks: number, receivables: number, payables: number): number {
  return stocks + receivables - payables;
}

/**
 * Ratio de liquidité générale.
 */
export function calculateLiquidityRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * Compare deux scénarios d'investissement pour aide à la décision.
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
