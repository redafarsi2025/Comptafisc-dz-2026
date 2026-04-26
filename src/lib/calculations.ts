/**
 * @fileOverview Moteur de Calcul Financier (v4.0 Pro)
 * Modèles prédictifs et simulations de rentabilité.
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
};

export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
};

/**
 * Compare deux scénarios d'investissement pour aide à la décision.
 */
export function simulateInvestmentScenarios(amount: number, years: number, ibsRate: number) {
  // Scénario A : Achat direct (Autofinancement)
  const annualAmort = amount / years;
  const annualTaxSaving = annualAmort * ibsRate;
  const totalTaxSaving = annualTaxSaving * years;
  const netCostA = amount - totalTaxSaving;

  // Scénario B : Leasing (Simulation simplifiée)
  const monthlyLease = (amount * 1.25) / (years * 12); // Coût leasing estimé +25%
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
      immediateCashOut: monthlyLease // Premier loyer
    }
  };
}

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

export function calculateBFR(stocks: number, receivables: number, payables: number): number {
  return stocks + receivables - payables;
}

export function calculateLiquidityRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

export function getIBSRate(secteur: string): number {
  if (secteur === 'INDUSTRIE' || secteur === 'PRODUCTION') return TAX_RATES.IBS_PRODUCTION;
  if (secteur === 'BTP') return TAX_RATES.IBS_BTP;
  return TAX_RATES.IBS_NORMAL;
}
