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
  // Taux IBS (Impôt sur les Bénéfices des Sociétés) - CIDTA Art. 150
  IBS_PRODUCTION: 0.19,
  IBS_BTPH_TOURISM: 0.23,
  IBS_SERVICES_COMMERCE: 0.26,
  IBS_MINIMUM: 10000,
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_THRESHOLD: 30000,
};

/**
 * Calcule le taux de TAP précis. 
 * Retourne désormais 0 conformément à la LF 2024.
 */
export function getTAPRate(secteur: string, napCode?: string): number {
  // Conformité LF 2024 : La TAP est supprimée (0%)
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
 * Détermine le taux d'IBS applicable selon le secteur et le code NAP.
 */
export function getIBSRate(secteur: string, napCode?: string): number {
  if (secteur === "PRODUCTION") return TAX_RATES.IBS_PRODUCTION;
  if (secteur === "BTP") return TAX_RATES.IBS_BTPH_TOURISM;
  
  // Vérification spécifique pour le tourisme (Hôtellerie codes 55xx)
  if (napCode && napCode.startsWith('55')) return TAX_RATES.IBS_BTPH_TOURISM;
  
  // Défaut pour Services et Commerce
  return TAX_RATES.IBS_SERVICES_COMMERCE;
}

/**
 * Calcule l'IBS en respectant le minimum fiscal de 10 000 DA.
 */
export function calculateIBS(benefit: number, rate: number): number {
  if (benefit <= 0) return TAX_RATES.IBS_MINIMUM;
  const calculated = benefit * rate;
  return Math.max(calculated, TAX_RATES.IBS_MINIMUM);
}

export function calculateStampDuty(amount: number, isCash: boolean): number {
  if (!isCash) return 0;
  let duty = amount * TAX_RATES.STAMP_DUTY_RATE;
  if (duty < TAX_RATES.STAMP_DUTY_MIN) return TAX_RATES.STAMP_DUTY_MIN;
  if (duty > TAX_RATES.STAMP_DUTY_MAX) return TAX_RATES.STAMP_DUTY_MAX;
  return Math.ceil(duty);
}

export function calculateTVA(ht: number, enumRate: string = "TVA_19", isIFU: boolean = false): number {
  if (isIFU) return 0; // Un contribuable à l'IFU ne facture jamais de TVA
  const rate = enumRate === "TVA_19" ? 0.19 : enumRate === "TVA_9" ? 0.09 : 0;
  return ht * rate;
}

export function calculateIRG(salary: number): number {
  if (salary <= 30000) return 0;
  if (salary <= 35000) return (salary - 30000) * 0.2;
  return (salary - 35000) * 0.3 + 1000;
}
