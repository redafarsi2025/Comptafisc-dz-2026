import { findActivityByNap } from './nap-data';

/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Logique basée sur le CIDTA et les Lois de Finances 2024-2026.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  TAP_DEFAULT: 0.00, // Supprimée depuis LF 2024
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01,
  
  // --- IFU (Impôt Forfaitaire Unique) - Standard 2026 ---
  IFU_THRESHOLD: 8000000,       // Seuil standard (Art. 282ter)
  IFU_AUTO_THRESHOLD: 5000000,  // Seuil auto-entrepreneur
  IFU_PRODUCTION_VENTE: 0.05,   // 5% Production et vente de biens
  IFU_SERVICES: 0.12,           // 12% Services et professions libérales
  IFU_AUTO_ENTREPRENEUR: 0.005, // 0.5% Statut auto-entrepreneur
  IFU_RECYCLING: 0.05,          // 5% Collecte déchets/recyclage
  IFU_MIN_AUTO: 10000,          // Minimum auto-entrepreneur
  IFU_MIN_STANDARD: 30000,      // Minimum standard activités classiques
  IFU_RETENUE_SOURCE_DIGITAL: 0.05, // 5% plateformes numériques
  
  // --- IBS (Impôt sur les Bénéfices des Sociétés) ---
  IBS_PRODUCTION: 0.19,
  IBS_BTPH_TOURISM: 0.23,
  IBS_SERVICES_COMMERCE: 0.26,
  IBS_REINVESTMENT: 0.10,
  IBS_MINIMUM: 10000,

  // --- Taxes Para-fiscales (Annexe I) ---
  TAXE_APPRENTISSAGE: 0.01,     // 1% de la masse salariale
  TAXE_FORMATION_CONT: 0.01,    // 1% de la masse salariale
};

export const CASNOS_CONSTANTS = {
  RATE: 0.15,
  MIN_AMOUNT: 32400,
  MAX_AMOUNT: 648000,
  PENALTY_NON_DECLARATION: 5000,
  PENALTY_DELAY_RATE: 0.20,
  LATE_PAYMENT_INITIAL: 0.05,
  LATE_PAYMENT_MONTHLY: 0.01,
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  SNMG: 24000, // Revalorisé 2026
  IRG_THRESHOLD: 30000,
  CACOBATPH_CP: 0.1221,
  CACOBATPH_CI_EMPLOYER: 0.00375,
  CACOBATPH_CI_EMPLOYEE: 0.00375,
};

/** Calcule la cotisation CASNOS annuelle. */
export function calculateCASNOS(annualBase: number): number {
  const calculated = annualBase * CASNOS_CONSTANTS.RATE;
  if (calculated < CASNOS_CONSTANTS.MIN_AMOUNT) return CASNOS_CONSTANTS.MIN_AMOUNT;
  if (calculated > CASNOS_CONSTANTS.MAX_AMOUNT) return CASNOS_CONSTANTS.MAX_AMOUNT;
  return Math.round(calculated);
}

/** Calcule le taux d'IFU selon le secteur et la forme juridique. */
export function getIFURate(secteur: string, formeJuridique: string, isDigitalPlatform: boolean = false): number {
  if (isDigitalPlatform) return TAX_RATES.IFU_RETENUE_SOURCE_DIGITAL;
  if (formeJuridique === "Auto-entrepreneur") return TAX_RATES.IFU_AUTO_ENTREPRENEUR;
  if (secteur === "PRODUCTION" || secteur === "COMMERCE") return TAX_RATES.IFU_PRODUCTION_VENTE;
  return TAX_RATES.IFU_SERVICES;
}

/** Calcule le taux d'IBS applicable. */
export function getIBSRate(secteur: string, activiteNAP?: string): number {
  if (secteur === "PRODUCTION") return TAX_RATES.IBS_PRODUCTION;
  if (secteur === "BTP") return TAX_RATES.IBS_BTPH_TOURISM;
  return TAX_RATES.IBS_SERVICES_COMMERCE;
}

/** Calcule l'IFU en respectant les minimums légaux et les exonérations. */
export function calculateIFU(ca: number, rate: number, isAuto: boolean, isExempt: boolean = false): number {
  if (isExempt) return 0;
  const minTax = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  const calculated = ca * rate;
  return Math.max(calculated, minTax);
}

/** Calcule l'IRG Salarié - Barème 2026 complet avec abattements lissés. */
export function calculateIRG(netImposable: number, isGrandSud: boolean = false, isHandicappedOrRetired: boolean = false): number {
  // Arrondi à la dizaine de dinars inférieure
  const base = Math.floor(netImposable / 10) * 10;
  
  // 1. Exonération totale si <= 30 000 DA
  if (base <= 30000) return 0;

  // 2. Calcul selon le barème progressif mensualisé
  let irgBrut = 0;
  if (base <= 20000) {
    irgBrut = 0;
  } else if (base <= 40000) {
    irgBrut = (base - 20000) * 0.23;
  } else if (base <= 80000) {
    irgBrut = (40000 - 20000) * 0.23 + (base - 40000) * 0.27;
  } else if (base <= 160000) {
    irgBrut = (40000 - 20000) * 0.23 + (80000 - 40000) * 0.27 + (base - 80000) * 0.30;
  } else if (base <= 320000) {
    irgBrut = (40000 - 20000) * 0.23 + (80000 - 40000) * 0.27 + (160000 - 80000) * 0.30 + (base - 160000) * 0.33;
  } else {
    irgBrut = (40000 - 20000) * 0.23 + (80000 - 40000) * 0.27 + (160000 - 80000) * 0.30 + (320000 - 160000) * 0.33 + (base - 320000) * 0.35;
  }

  // 3. Premier abattement de 40% (Min 1000, Max 1500)
  let abattement1 = irgBrut * 0.4;
  if (abattement1 < 1000) abattement1 = 1000;
  if (abattement1 > 1500) abattement1 = 1500;

  let irgApresAbat1 = Math.max(0, irgBrut - abattement1);

  // 4. Calcul final selon la catégorie et les seuils de lissage
  let irgFinal = 0;

  if (isHandicappedOrRetired) {
    // Régime spécifique : Travailleurs handicapés et retraités
    if (base <= 42500) {
      // Formule de lissage spécifique : (93/61) * IRG_abat1 - (81213/41)
      irgFinal = irgApresAbat1 * (93/61) - (81213/41);
    } else {
      irgFinal = irgApresAbat1;
    }
  } else {
    // Régime standard : Travailleurs salariés
    if (base <= 35000) {
      // Formule de lissage spécifique : (137/51) * IRG_abat1 - (27925/8)
      irgFinal = irgApresAbat1 * (137/51) - (27925/8);
    } else {
      irgFinal = irgApresAbat1;
    }
  }

  // 5. Abattement Zone Sud (IZCV) de 50%
  if (isGrandSud) {
    irgFinal *= 0.5;
  }

  return Math.round(Math.max(0, irgFinal));
}

export function calculateStampDuty(amount: number, isCash: boolean): number {
  if (!isCash) return 0;
  let duty = amount * TAX_RATES.STAMP_DUTY_RATE;
  if (duty < TAX_RATES.STAMP_DUTY_MIN) return TAX_RATES.STAMP_DUTY_MIN;
  if (duty > TAX_RATES.STAMP_DUTY_MAX) return TAX_RATES.STAMP_DUTY_MAX;
  return Math.ceil(duty);
}

export function calculateTVA(ht: number, enumRate: string = "TVA_19", isIFU: boolean = false): number {
  if (isIFU) return 0;
  const rate = enumRate === "TVA_19" ? 0.19 : enumRate === "TVA_9" ? 0.09 : 0;
  return ht * rate;
}

export function calculateIBS(benefit: number, rate: number, reinvestedAmount: number = 0): number {
  if (benefit <= 0) return TAX_RATES.IBS_MINIMUM;
  const actualReinvested = Math.min(reinvestedAmount, benefit);
  const remainingBenefit = benefit - actualReinvested;
  const calculated = (remainingBenefit * rate) + (actualReinvested * 0.10); // 10% si réinvesti
  return Math.max(calculated, TAX_RATES.IBS_MINIMUM);
}
