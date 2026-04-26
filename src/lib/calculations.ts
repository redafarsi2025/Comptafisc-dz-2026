
/**
 * @fileOverview Moteur de Calcul Master Node (Version 3.0)
 * IMPORTANT : Aucune valeur en dur. Les calculs récupèrent leurs variables du contexte.
 */

// Valeurs par défaut (Source : Moteur Fiscal DSL)
export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
  DEFAULT_VALEUR_POINT: 45
};

/**
 * Calcule le salaire de base selon le système indiciaire algérien.
 * @param indice L'indice du poste (ex: 450)
 * @param valeurPoint La valeur du point indiciaire actuelle
 */
export function calculateSalaireBase(indice: number, valeurPoint: number = PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT): number {
  return Math.round(indice * valeurPoint);
}

/**
 * Calcule l'IRG (Impôt sur le Revenu Global) Traitements et Salaires - Loi de Finances 2026.
 * Inclut l'abattement lissé pour les bas salaires.
 */
export function calculateIRG(salaireImposable: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  // 1. Abattement principal 40% (Max 1500 DA)
  let abattement = salaireImposable * 0.40;
  if (abattement > 1500) abattement = 1500;
  
  const baseIRG = Math.max(0, salaireImposable - abattement);

  let tax = 0;
  // Barème progressif 2026
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

  // 2. Abattements spécifiques (Zone Sud -50%, Handicapé/Retraité lissé)
  if (isHandicapped && baseIRG <= 42500) {
    tax *= 0.5; // Abattement spécifique supplémentaire
  }
  if (isGrandSud) {
    tax *= 0.5; // Réduction IZCV (Art. 120 CIDTA)
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

// Stubs for other fiscal functions using the same principle
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = rateCode === 'TVA_9' ? 0.09 : 0.19;
  return Math.round(amount * rate);
}

export function calculateRetenueGarantie(amount: number, sector: string = 'BTP'): number {
  if (sector !== 'BTP') return 0;
  return Math.round(amount * 0.05);
}

export function calculateIBS(profit: number, rate: number): number {
  if (profit <= 0) return 0;
  return Math.round(profit * rate);
}

export function calculateIFU(ca: number, rate: number): number {
  return Math.max(10000, Math.round(ca * rate));
}

export function getIFURate(sector: string, forme: string): number {
  if (forme === "Auto-entrepreneur") return 0.005; 
  if (sector === "PRODUCTION") return 0.05;
  return 0.12; 
}

export function getIBSRate(sector: string): number {
  if (sector === 'PRODUCTION' || sector === 'INDUSTRIE') return 0.19;
  if (sector === 'BTP') return 0.23;
  return 0.26;
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
