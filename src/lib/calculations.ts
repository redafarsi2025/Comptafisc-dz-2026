
/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Logique basée sur la Loi de Finances Algérienne.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  TAP_DEFAULT: 0.015, // Taux standard 1.5% (LF 2024)
  TAP_PRODUCTION: 0.01, // Taux réduit 1% pour la production
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01, // 1% pour les paiements en espèces
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_THRESHOLD: 30000,
};

/**
 * Calcule le taux de TAP en fonction du secteur d'activité ou code NAP.
 */
export function getTAPRate(secteur: string): number {
  if (secteur === "PRODUCTION") return TAX_RATES.TAP_PRODUCTION;
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
