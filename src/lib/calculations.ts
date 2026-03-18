import { findActivityByNap } from './nap-data';

/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Logique basée sur la Loi de Finances Algérienne 2024-2026.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  // TAP supprimée par la Loi de Finances 2024 pour l'ensemble des contribuables
  TAP_DEFAULT: 0.00, 
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01,
  // Taux IFU (Impôt Forfaitaire Unique) - Maintenus en LF 2024
  IFU_PRODUCTION_VENTE: 0.05,
  IFU_SERVICES: 0.12,
  IFU_AUTO_ENTREPRENEUR: 0.005,
  IFU_MIN_AUTO: 10000,
  IFU_MIN_STANDARD: 30000,
  // Taux IBS (Impôt sur les Bénéfices des Sociétés) - CIDTA Art. 150
  IBS_PRODUCTION: 0.19,
  IBS_BTPH_TOURISM: 0.23,
  IBS_SERVICES_COMMERCE: 0.26,
  IBS_REINVESTMENT: 0.10, // Taux réduit sur bénéfices réinvestis
  IBS_MINIMUM: 10000,
  IBS_INSTALLMENT_RATE: 0.30, // 30% par acompte
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  SNMG: 20000, // Salaire National Minimum Garanti
  IRG_THRESHOLD: 30000,
};

/**
 * Calcule le taux de TAP précis. 
 * Retourne désormais 0 conformément à la LF 2024.
 */
export function getTAPRate(secteur: string, napCode?: string): number {
  return 0;
}

/**
 * Calcule le taux d'IFU applicable selon le secteur et la forme juridique.
 */
export function getIFURate(secteur: string, formeJuridique: string): number {
  if (formeJuridique === "Auto-entrepreneur") return TAX_RATES.IFU_AUTO_ENTREPRENEUR;
  if (secteur === "PRODUCTION" || secteur === "COMMERCE") return TAX_RATES.IFU_PRODUCTION_VENTE;
  return TAX_RATES.IFU_SERVICES;
}

/**
 * Détermine le minimum d'imposition IFU.
 */
export function getIFUMinimum(formeJuridique: string): number {
  return formeJuridique === "Auto-entrepreneur" ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
}

/**
 * Détermine le taux d'IBS applicable selon le secteur et le code NAP.
 */
export function getIBSRate(secteur: string, napCode?: string): number {
  if (secteur === "PRODUCTION") return TAX_RATES.IBS_PRODUCTION;
  if (secteur === "BTP") return TAX_RATES.IBS_BTPH_TOURISM;
  if (napCode && napCode.startsWith('55')) return TAX_RATES.IBS_BTPH_TOURISM;
  return TAX_RATES.IBS_SERVICES_COMMERCE;
}

/**
 * Calcule l'IBS en respectant le minimum fiscal de 10 000 DA
 * et en appliquant le taux réduit de 10% sur la part réinvestie.
 */
export function calculateIBS(benefit: number, rate: number, reinvestedAmount: number = 0): number {
  if (benefit <= 0) return TAX_RATES.IBS_MINIMUM;
  const actualReinvested = Math.min(reinvestedAmount, benefit);
  const remainingBenefit = benefit - actualReinvested;
  const calculated = (remainingBenefit * rate) + (actualReinvested * TAX_RATES.IBS_REINVESTMENT);
  return Math.max(calculated, TAX_RATES.IBS_MINIMUM);
}

/**
 * Calcule le montant d'un acompte provisionnel IBS (30% de l'IBS N-1).
 */
export function calculateIBSInstallment(previousYearIBS: number): number {
  if (previousYearIBS <= 0) return 0;
  return previousYearIBS * TAX_RATES.IBS_INSTALLMENT_RATE;
}

/**
 * Retourne le calendrier des acomptes IBS pour l'année en cours.
 */
export function getIBSInstallmentDeadlines(year: number) {
  return [
    { name: "1er Acompte (30%)", start: `${year}-02-20`, end: `${year}-03-20`, status: "upcoming" },
    { name: "2ème Acompte (30%)", start: `${year}-05-20`, end: `${year}-06-20`, status: "upcoming" },
    { name: "3ème Acompte (30%)", start: `${year}-10-20`, end: `${year}-11-20`, status: "upcoming" },
    { name: "Liquidation (Solde)", start: `${year + 1}-01-01`, end: `${year + 1}-04-30`, status: "upcoming" },
  ];
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

/**
 * Calcule l'IRG Salarié selon le barème progressif LF 2026.
 */
export function calculateIRG(
  netImposable: number, 
  isGrandSud: boolean = false, 
  isHandicapped: boolean = false
): number {
  // 1. Arrondi au dizaine inférieur
  const base = Math.floor(netImposable / 10) * 10;

  if (base <= 30000) return 0;

  // 2. Barème progressif mensuel 2026
  // 0 - 30,000 : 0%
  // 30,001 - 120,000 : 23%
  // 120,001 - 360,000 : 27%
  // 360,001 - 1,440,000 : 30%
  // + 1,440,000 : 35%
  
  let irgStandard = 0;
  const rgi = base - 30000; // La première tranche de 30k est à 0%

  if (base <= 120000) {
    irgStandard = rgi * 0.23;
  } else if (base <= 360000) {
    irgStandard = (120000 - 30000) * 0.23 + (base - 120000) * 0.27;
  } else if (base <= 1440000) {
    irgStandard = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (base - 360000) * 0.30;
  } else {
    irgStandard = (120000 - 30000) * 0.23 + (360000 - 120000) * 0.27 + (1440000 - 360000) * 0.30 + (base - 1440000) * 0.35;
  }

  // 3. Abattement de 40% (Min 1000, Max 1500)
  let abattement = irgStandard * 0.4;
  if (abattement < 1000) abattement = 1000;
  if (abattement > 1500) abattement = 1500;

  let irgFinal = Math.max(0, irgStandard - abattement);

  // 4. Réductions spécifiques
  // Grand Sud (souvent 50% de réduction sur l'IRG dû)
  if (isGrandSud) {
    irgFinal = irgFinal * 0.5;
  }

  // Handicap (Abattement supplémentaire souvent géré par réduction de 50% également)
  if (isHandicapped) {
    irgFinal = irgFinal * 0.5;
  }

  return Math.round(irgFinal);
}