/**
 * @fileOverview Moteur de Calcul (Proxy vers Moteur Fiscal Master)
 * Note : Les constantes sont progressivement migrées vers le noyau DSL (Firestore).
 */

// Valeurs de secours (Source : Moteur Fiscal DSL)
export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_THRESHOLD: 30000,
  DEFAULT_VALEUR_POINT: 45
};

/**
 * Prix des carburants réglementés en Algérie (DZD/L)
 * Ces valeurs sont utilisées pour le pré-remplissage des tickets.
 */
export const FUEL_PRICES = {
  DIESEL: 29.06,    // Gasoil
  GASOLINE: 45.62,  // Sans Plomb
  GPL: 9.00,        // Sirghaz
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
  if (salaireImposable <= 30000) return 0;

  // 1. Calcul de l'IRG Théorique par tranches (Nouveau barème 2026)
  let theoreticalTax = 0;
  
  if (salaireImposable <= 120000) {
    theoreticalTax = (salaireImposable - 30000) * 0.23;
  } else if (salaireImposable <= 360000) {
    theoreticalTax = (120000 - 30000) * 0.23 + (salaireImposable - 120000) * 0.27;
  } else if (salaireImposable <= 1440000) {
    theoreticalTax = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (salaireImposable - 360000) * 0.30;
  } else {
    theoreticalTax = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (1440000 - 360000) * 0.30 + (salaireImposable - 1440000) * 0.33;
  }

  // 2. Application de l'abattement de 40% (Min 1000, Max 1500)
  let abattement = theoreticalTax * 0.40;
  if (abattement < 1000) abattement = 1000;
  if (abattement > 1500) abattement = 1500;
  
  if (abattement > theoreticalTax) abattement = theoreticalTax;

  let netTax = theoreticalTax - abattement;

  // 3. Réduction spécifique Travailleurs Handicapés (Si base < 40 000 DA)
  if (isHandicapped && salaireImposable < 40000) {
    netTax *= 0.5;
  }

  // 4. Réduction Zone Grand Sud (Abattement de 50%)
  if (isGrandSud) {
    netTax *= 0.5;
  }

  return Math.round(netTax);
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
 * Calcule la TVA selon le régime.
 */
export function calculateTVA(amount: number, rateCode: string = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = rateCode === 'TVA_9' ? 0.09 : 0.19;
  return Math.round(amount * rate);
}

/**
 * Droit de timbre sur les paiements en espèces.
 * Note : La logique officielle est maintenant portée par le Moteur DSL RULE_STAMP_2026.
 * Cette fonction sert de secours (fallback).
 */
export function calculateStampDuty(totalTTC: number, isCash: boolean): number {
  if (!isCash) return 0;
  // Logique alignée sur RULE_STAMP_2026
  let stamp = Math.ceil(totalTTC * 0.01);
  if (stamp < 5) stamp = 5;
  if (stamp > 10000) stamp = 10000;
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
 * Calcule l'efficience carburant (L/100km).
 */
export function calculateFuelEfficiency(liters: number, currentOdo: number, prevOdo: number): number {
  const distance = currentOdo - prevOdo;
  if (distance <= 0) return 0;
  return (liters / distance) * 100;
}

/**
 * Simule des scénarios d'investissement (Achat direct vs Leasing).
 */
export function simulateInvestmentScenarios(amount: number, years: number, taxRate: number) {
  // Scénario Achat Direct
  const annualDepreciation = amount / years;
  const totalTaxSaving = annualDepreciation * taxRate * years;
  const netCostPurchase = amount - totalTaxSaving;

  // Scénario Leasing (Simplifié pour la démo)
  const interestRate = 0.08; // 8% fictif
  const totalInterest = amount * interestRate * years;
  const totalLeaseAmount = amount + totalInterest;
  const monthlyLease = totalLeaseAmount / (years * 12);
  const totalLeaseTaxSaving = totalLeaseAmount * taxRate; // Loyers 100% déductibles
  const netCostLeasing = totalLeaseAmount - totalLeaseTaxSaving;

  return {
    purchase: {
      netCost: netCostPurchase,
      totalTaxSaving
    },
    leasing: {
      netCost: netCostLeasing,
      monthlyLease
    }
  };
}

/**
 * Calcule les métriques RH pour le simulateur.
 */
export function calculateRHMetrics({ brut, primes, avantages }: { brut: number, primes: number, avantages: number }) {
  const salairePoste = brut + primes;
  const cnasSalariale = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
  const imposable = salairePoste - cnasSalariale;
  const irg = calculateIRG(imposable);
  const net = (imposable - irg) + avantages;
  
  const cnasPatronale = salairePoste * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
  const cost = salairePoste + cnasPatronale + avantages;

  return {
    net,
    cost,
    irg,
    ratio: cost > 0 ? (net / cost) * 100 : 0
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
