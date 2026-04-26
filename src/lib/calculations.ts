
/**
 * @fileOverview Moteur de Calcul Master Node (Version 3.1)
 * Intégration des calculs de logistique et consommation.
 */

// Valeurs de secours (Source : Moteur Fiscal DSL)
export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
  DEFAULT_VALEUR_POINT: 45
};

/**
 * Calcule le salaire de base selon le système indiciaire algérien.
 */
export function calculateSalaireBase(indice: number, valeurPoint: number = PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT): number {
  return Math.round(indice * valeurPoint);
}

/**
 * Calcule l'IRG (Impôt sur le Revenu Global) Traitements et Salaires - Loi de Finances 2026.
 */
export function calculateIRG(salaireImposable: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  let abattement = salaireImposable * 0.40;
  if (abattement > 1500) abattement = 1500;
  
  const baseIRG = Math.max(0, salaireImposable - abattement);

  let tax = 0;
  if (baseIRG <= 30000) {
    tax = 0;
  } else if (baseIRG <= 120000) {
    tax = (baseIRG - 30000) * 0.20;
  } else if (baseIRG <= 360000) {
    tax = (120000 - 30000) * 0.20 + (baseIRG - 120000) * 0.30;
  } else if (baseIRG <= 1440000) {
    tax = (120000 - 30000) * 0.20 + (360000 - 120000) * 0.30 + (baseIRG - 360000) * 0.33;
  } else {
    tax = (120000 - 30000) * 0.20 + (360000 - 120000) * 0.30 + (1440000 - 360000) * 0.33 + (baseIRG - 1440000) * 0.35;
  }

  if (isHandicapped && baseIRG <= 42500) {
    tax *= 0.5;
  }
  if (isGrandSud) {
    tax *= 0.5;
  }

  return Math.round(tax);
}

/**
 * Moteur de paie consolidé pour un employé.
 */
export function processEmployeePayroll(emp: any, context: { valeurPoint: number }) {
  const salaireBase = calculateSalaireBase(emp.indice || 0, context.valeurPoint);
  const primesImposables = Number(emp.primesImposables) || 0;
  const indemnitesFrais = (Number(emp.indemnitePanier) || 0) + (Number(emp.indemniteTransport) || 0);

  const salairePoste = salaireBase + primesImposables;
  const cnasSalariale = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
  const imposable = salairePoste - cnasSalariale;
  
  const irg = calculateIRG(imposable, emp.isGrandSud, emp.isHandicapped);
  const net = (imposable - irg) + indemnitesFrais;
  
  const cnasPatronale = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYER;

  return {
    salaireBase,
    salairePoste,
    cnasSalariale,
    imposable,
    irg,
    net,
    cnasPatronale,
    totalCout: salairePoste + cnasPatronale + indemnitesFrais
  };
}

/**
 * Métriques RH de simulation.
 */
export function calculateRHMetrics(input: { brut: number, primes: number, avantages: number }) {
  const cnasE = input.brut * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
  const imposable = input.brut - cnasE;
  const irg = calculateIRG(imposable);
  const net = (imposable - irg) + input.avantages;
  const cost = input.brut + (input.brut * PAYROLL_CONSTANTS.CNAS_EMPLOYER) + input.avantages;

  return {
    net,
    cost,
    irg,
    ratio: cost > 0 ? (net / cost) * 100 : 0
  };
}

/**
 * Calcule la TVA selon le régime.
 */
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = rateCode === 'TVA_9' ? 0.09 : 0.19;
  return Math.round(amount * rate);
}

/**
 * Droit de timbre sur les paiements en espèces.
 */
export function calculateStampDuty(totalTTC: number, isCash: boolean): number {
  if (!isCash) return 0;
  let stamp = Math.ceil(totalTTC * 0.01);
  if (stamp < 5) stamp = 5;
  if (stamp > 2500) stamp = 2500;
  return stamp;
}

/**
 * Calcule la retenue de garantie BTP.
 */
export function calculateRetenueGarantie(amount: number, sector: string = 'BTP', customRate?: number): number {
  if (sector !== 'BTP') return 0;
  const rate = customRate ? customRate / 100 : 0.05;
  return Math.round(amount * rate);
}

/**
 * Calcule l'IBS selon le secteur.
 */
export function calculateIBS(profit: number, rate: number, reinvestedAmount: number = 0): number {
  if (profit <= 0) return 0;
  const taxableBase = Math.max(0, profit - reinvestedAmount);
  return Math.round(taxableBase * rate);
}

/**
 * Calcule l'IFU (Impôt Forfaitaire Unique).
 */
export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0;
  return Math.max(10000, Math.round(ca * rate));
}

/**
 * Résout le taux IFU par secteur.
 */
export function getIFURate(sector: string, forme: string): number {
  if (forme === "Auto-entrepreneur") return 0.005;
  if (sector === "PRODUCTION" || sector === "INDUSTRIE") return 0.05;
  return 0.12;
}

/**
 * Résout le taux IBS par secteur (Art. 150 CIDTA).
 */
export function getIBSRate(sector: string, napCode?: string): number {
  if (sector === 'PRODUCTION' || sector === 'INDUSTRIE') return 0.19;
  if (sector === 'BTP') return 0.23;
  return 0.26;
}

/**
 * Calcule le Besoin en Fonds de Roulement (BFR).
 */
export function calculateBFR(stocks: number, receivables: number, payables: number): number {
  return stocks + receivables - payables;
}

/**
 * Calcule le Ratio de Liquidité Générale.
 */
export function calculateLiquidityRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * Simule des scénarios d'investissement.
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

/**
 * Calcule l'efficience carburant (L/100km).
 * @param liters Quantité de carburant ajoutée
 * @param currentOdo Kilométrage actuel
 * @param prevOdo Kilométrage au dernier plein
 */
export function calculateFuelEfficiency(liters: number, currentOdo: number, prevOdo: number): number {
  const distance = currentOdo - prevOdo;
  if (distance <= 0) return 0;
  return (liters / distance) * 100;
}

export const TAX_RATES = {
  IFU_THRESHOLD: 8000000,
  IFU_AUTO_THRESHOLD: 5000000,
  IFU_MIN_STANDARD: 10000,
  IFU_MIN_AUTO: 10000,
  TAXE_APPRENTISSAGE: 0.01,
  TAXE_FORMATION_CONT: 0.01
};

export const CASNOS_CONSTANTS = {
  MIN_AMOUNT: 32400,
  MAX_AMOUNT: 648000,
  RATE: 0.15
};

export function calculateCASNOS(annualBase: number): number {
  let contribution = annualBase * CASNOS_CONSTANTS.RATE;
  if (contribution < CASNOS_CONSTANTS.MIN_AMOUNT) contribution = CASNOS_CONSTANTS.MIN_AMOUNT;
  if (contribution > CASNOS_CONSTANTS.MAX_AMOUNT) contribution = CASNOS_CONSTANTS.MAX_AMOUNT;
  return Math.round(contribution);
}
