import { findActivityByNap } from './nap-data';

/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Logique basée sur la Loi de Finances Algérienne 2024-2026.
 * Référence : Art. 282bis à 282nonies du CIDTA.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  TAP_DEFAULT: 0.00, // Supprimée LF 2024
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01,
  
  // --- IFU (Impôt Forfaitaire Unique) - Mise à jour 2026 ---
  IFU_THRESHOLD: 8000000, // Seuil standard (Art. 282ter)
  IFU_AUTO_THRESHOLD: 5000000, // Seuil auto-entrepreneur
  IFU_PRODUCTION_VENTE: 0.05,
  IFU_SERVICES: 0.12,
  IFU_AUTO_ENTREPRENEUR: 0.005,
  IFU_MIN_AUTO: 10000,
  IFU_MIN_STANDARD: 30000,
  IFU_RETENUE_SOURCE_DIGITAL: 0.05, // Retenue 5% plateformes numériques
  
  // --- IBS (Impôt sur les Bénéfices des Sociétés) ---
  IBS_PRODUCTION: 0.19,
  IBS_BTPH_TOURISM: 0.23,
  IBS_SERVICES_COMMERCE: 0.26,
  IBS_REINVESTMENT: 0.10,
  IBS_MINIMUM: 10000,
  IBS_INSTALLMENT_RATE: 0.30,
};

// Liste des activités EXCLUES de l'IFU (Art. 282ter / Art. 22 LF 2025)
export const IFU_EXCLUDED_ACTIVITIES = [
  "PROMOTION_IMMOBILIERE",
  "IMPORTATION_REVENTE_ETAT",
  "VENTE_GROS",
  "CONCESSIONNAIRE",
  "CLINIQUE_PRIVE",
  "LABORATOIRE_MEDICAL",
  "RESTAURATION_HOTELLERIE_CLASSEE",
  "METAUX_PRECIEUX",
  "TRAVAUX_PUBLICS_HYDRAULIQUES",
  "BOISSONS_ALCOOLISEES",
  "TABAC",
  "TRAITEUR_CATERING",
  "LOCATION_SALLES_FETES",
  "GRANDE_SURFACE",
  "LOCATION_VEHICULES",
  "LOCATION_ENGINS",
  "AGENCE_VOYAGE",
  "AGENCE_PUBLICITE",
  "FORMATION_ENSEIGNEMENT",
  "COURTIER_ASSURANCE"
];

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  SNMG: 24000,
  IRG_THRESHOLD: 30000,
  CACOBATPH_CP: 0.1221,
  CACOBATPH_CI_EMPLOYER: 0.00375,
  CACOBATPH_CI_EMPLOYEE: 0.00375,
};

/**
 * Calcule le taux d'IFU applicable selon le secteur et la forme juridique.
 * Gère les cas particuliers : Auto-entrepreneur, Production, Services.
 */
export function getIFURate(secteur: string, formeJuridique: string, isDigitalPlatform: boolean = false): number {
  if (isDigitalPlatform) return TAX_RATES.IFU_RETENUE_SOURCE_DIGITAL;
  if (formeJuridique === "Auto-entrepreneur") return TAX_RATES.IFU_AUTO_ENTREPRENEUR;
  if (secteur === "PRODUCTION" || secteur === "COMMERCE") return TAX_RATES.IFU_PRODUCTION_VENTE;
  return TAX_RATES.IFU_SERVICES;
}

/**
 * Calcule l'IFU en respectant les minimums légaux (30k/10k) et les proratas.
 */
export function calculateIFU(ca: number, rate: number, isAuto: boolean, isExempt: boolean = false): number {
  if (isExempt) return 0;
  const minTax = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  const calculated = ca * rate;
  return Math.max(calculated, minTax);
}

/**
 * Calcule les majorations de retard pour les déclarations IFU (Art. 282nonies).
 */
export function calculateLatePenalty(taxAmount: number, monthsDelay: number): number {
  if (monthsDelay <= 0) return 0;
  if (monthsDelay <= 1) return taxAmount * 0.10;
  if (monthsDelay <= 2) return taxAmount * 0.20;
  return taxAmount * 0.25;
}

/**
 * Calcule l'IRG Salarié selon le barème progressif LF 2026.
 */
export function calculateIRG(
  netImposable: number, 
  isGrandSud: boolean = false, 
  isHandicapped: boolean = false
): number {
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
  if (isGrandSud) irgFinal *= 0.5;
  if (isHandicapped) irgFinal *= 0.5;

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
  const calculated = (remainingBenefit * rate) + (actualReinvested * TAX_RATES.IBS_REINVESTMENT);
  return Math.max(calculated, TAX_RATES.IBS_MINIMUM);
}

export function calculateIBSInstallment(previousYearIBS: number): number {
  if (previousYearIBS <= 0) return 0;
  return previousYearIBS * TAX_RATES.IBS_INSTALLMENT_RATE;
}

export function getIBSInstallmentDeadlines(year: number) {
  return [
    { name: "1er Acompte (30%)", start: `${year}-02-20`, end: `${year}-03-20`, status: "upcoming" },
    { name: "2ème Acompte (30%)", start: `${year}-05-20`, end: `${year}-06-20`, status: "upcoming" },
    { name: "3ème Acompte (30%)", start: `${year}-10-20`, end: `${year}-11-20`, status: "upcoming" },
    { name: "Liquidation (Solde)", start: `${year + 1}-01-01`, end: `${year + 1}-04-30`, status: "upcoming" },
  ];
}
