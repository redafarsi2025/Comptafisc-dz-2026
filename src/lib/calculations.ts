
import { findActivityByNap } from './nap-data';

/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Logique basée sur la Loi de Finances Algérienne et Nomenclature NAP.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  TAP_DEFAULT: 0.015,
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01,
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_THRESHOLD: 30000,
};

/**
 * Calcule le taux de TAP précis en fonction du code NAP.
 * Si le code NAP n'est pas trouvé, utilise le taux par défaut du secteur.
 */
export function getTAPRate(secteur: string, napCode?: string): number {
  if (napCode) {
    const activity = findActivityByNap(napCode);
    if (activity) return activity.tapRate;
  }
  
  // Fallback sectoriel
  if (secteur === "PRODUCTION") return 0.01;
  if (secteur === "BTP") return 0.03;
  if (secteur === "AGRICULTURE") return 0.00;
  return TAX_RATES.TAP_DEFAULT;
}

export function calculateStampDuty(amount: number, isCash: boolean): number {
  if (!isCash) return 0;
  let duty = amount * TAX_RATES.STAMP_DUTY_RATE;
  if (duty < TAX_RATES.STAMP_DUTY_MIN) return TAX_RATES.STAMP_DUTY_MIN;
  if (duty > TAX_RATES.STAMP_DUTY_MAX) return TAX_RATES.STAMP_DUTY_MAX;
  return Math.ceil(duty);
}

export function calculateTVA(ht: number, enumRate: string = "TVA_19"): number {
  const rate = enumRate === "TVA_19" ? 0.19 : enumRate === "TVA_9" ? 0.09 : 0;
  return ht * rate;
}

export function calculateIRG(salary: number): number {
  if (salary <= 30000) return 0;
  // Barème simplifié 2024
  if (salary <= 35000) return (salary - 30000) * 0.2;
  return (salary - 35000) * 0.3 + 1000;
}
