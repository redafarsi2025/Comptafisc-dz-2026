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

// Activités EXCLUES de l'IFU (Art. 282ter / Art. 22 LF 2025)
export const IFU_EXCLUDED_ACTIVITIES = [
  "PROMOTION_IMMOBILIERE", "IMPORTATION", "VENTE_GROS", "CONCESSIONNAIRE",
  "CLINIQUE_PRIVE", "LABORATOIRE_MEDICAL", "RESTAURATION_HOTELLERIE_CLASSEE",
  "METAUX_PRECIEUX", "TRAVAUX_PUBLICS_HYDRAULIQUES", "BOISSONS_ALCOOLISEES",
  "TABAC", "TRAITEUR_CATERING", "LOCATION_SALLES_FETES", "GRANDE_SURFACE",
  "LOCATION_VEHICULES", "LOCATION_ENGINS", "AGENCE_VOYAGE", "AGENCE_PUBLICITE",
  "FORMATION_ENSEIGNEMENT", "COURTIER_ASSURANCE"
];

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  SNMG: 24000, // Revalorisé 2026
  IRG_THRESHOLD: 30000,
  CACOBATPH_CP: 0.1221,
  CACOBATPH_CI_EMPLOYER: 0.00375,
  CACOBATPH_CI_EMPLOYEE: 0.00375,
};

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

/** Retourne le taux de TAP (0% depuis LF 2024). */
export function getTAPRate(): number {
  return TAX_RATES.TAP_DEFAULT;
}

/** Calcule l'IFU en respectant les minimums légaux et les exonérations. */
export function calculateIFU(ca: number, rate: number, isAuto: boolean, isExempt: boolean = false): number {
  if (isExempt) return 0;
  const minTax = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  const calculated = ca * rate;
  return Math.max(calculated, minTax);
}

/** Calcule les majorations de retard IFU (Art. 282 nonies). */
export function calculateLatePenalty(taxAmount: number, monthsDelay: number, isDefinitive: boolean = false): number {
  if (monthsDelay <= 0) return 0;
  
  // Majorations de retard standard
  let penalty = 0;
  if (monthsDelay <= 1) penalty = taxAmount * 0.10;
  else if (monthsDelay <= 2) penalty = taxAmount * 0.20;
  else penalty = taxAmount * 0.25;

  // Amendes fixes si pas de paiement (uniquement sur G12 bis)
  if (isDefinitive && taxAmount === 0) {
    if (monthsDelay <= 1) return 2500;
    if (monthsDelay <= 2) return 5000;
    return 10000;
  }

  return penalty;
}

/** Calcule l'IRG Salarié - Barème 2026. */
export function calculateIRG(netImposable: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  const base = Math.floor(netImposable / 10) * 10;
  if (base <= 30000) return 0;

  let irgStandard = 0;
  if (base <= 120000) {
    irgStandard = (base - 30000) * 0.23;
  } else if (base <= 360000) {
    irgStandard = (120000 - 30000) * 0.23 + (base - 120000) * 0.27;
  } else if (base <= 1440000) {
    irgStandard = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (base - 360000) * 0.30;
  } else {
    irgStandard = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (1440000 - 360000) * 0.30 + (base - 1440000) * 0.35;
  }

  let abattement = irgStandard * 0.4;
  if (abattement < 1000) abattement = 1000;
  if (abattement > 1500) abattement = 1500;

  let irgFinal = Math.max(0, irgStandard - abattement);
  if (isGrandSud || isHandicapped) irgFinal *= 0.5;

  return Math.round(irgFinal);
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
