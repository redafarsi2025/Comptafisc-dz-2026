/**
 * Algerian Tax & Payroll Calculation Engine (Client-side)
 * Values typically come from Firestore in a real app.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  TAP_DEFAULT: 0.015, // Taxe sur l'Activité Professionnelle (LF 2024 reform)
  STAMP_DUTY_MAX: 2500,
  STAMP_DUTY_MIN: 5,
  STAMP_DUTY_RATE: 0.01, // 1% for cash payments
};

export const PAYROLL_CONSTANTS = {
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_THRESHOLD: 30000, // Minimal taxable income
};

export function calculateStampDuty(amount: number, isCash: boolean): number {
  if (!isCash) return 0;
  let duty = amount * TAX_RATES.STAMP_DUTY_RATE;
  if (duty < TAX_RATES.STAMP_DUTY_MIN) return TAX_RATES.STAMP_DUTY_MIN;
  if (duty > TAX_RATES.STAMP_DUTY_MAX) return TAX_RATES.STAMP_DUTY_MAX;
  return Math.ceil(duty);
}

export function calculateTVA(ht: number, rate: number = TAX_RATES.TVA_NORMAL): number {
  return ht * rate;
}

export function calculateIRG(salary: number): number {
  // Simplified IRG calculation for demonstration based on official scales
  if (salary <= 30000) return 0;
  if (salary <= 35000) return (salary - 30000) * 0.2; // Mock logic
  return (salary - 35000) * 0.3 + 1000;
}