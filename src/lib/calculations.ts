
/**
 * @fileOverview Moteur de Calcul (Refactoré v2.5)
 * Ce fichier contient les constantes et fonctions de base conformes à la LF 2026.
 * Il sert désormais de point d'entrée statique avec option de résolution dynamique via le Moteur Fiscal Master.
 */

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUIT: 0.09,
  IBS_NORMAL: 0.26,
  IBS_PRODUCTION: 0.19,
  IBS_SERVICES: 0.23,
  IBS_BTP: 0.26,
  IFU_THRESHOLD: 8000000,
  IFU_AUTO_THRESHOLD: 5000000,
  IFU_MIN_STANDARD: 10000,
  IFU_MIN_AUTO: 10000,
  TAXE_APPRENTISSAGE: 0.01,
  TAXE_FORMATION_CONT: 0.01,
};

export const PAYROLL_CONSTANTS = {
  SNMG: 24000,
  CNAS_EMPLOYEE: 0.09,
  CNAS_EMPLOYER: 0.26,
  IRG_EXEMPT_THRESHOLD: 30000,
};

export const CASNOS_CONSTANTS = {
  MIN_AMOUNT: 32400,
  MAX_AMOUNT: 648000,
  RATE: 0.15,
};

// --- Moteurs de Calcul Statics (Fallbacks) ---

/**
 * Calculateur IRG Salarié - Version 2026 (Algorithme Master)
 */
export function calculateIRG(netImposable: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  const amount = Math.floor(netImposable / 10) * 10;
  
  // Règle LF 2026 : Exonération totale sous 30 000 DA
  if (amount <= 30000) return 0;

  let tax = 0;
  // Barème progressif CIDTA 2026
  if (amount > 20000) {
    tax += (Math.min(amount, 40000) - 20000) * 0.23;
  }
  if (amount > 40000) {
    tax += (Math.min(amount, 80000) - 40000) * 0.27;
  }
  if (amount > 80000) {
    tax += (Math.min(amount, 160000) - 80000) * 0.30;
  }
  if (amount > 160000) {
    tax += (Math.min(amount, 320000) - 160000) * 0.33;
  }
  if (amount > 320000) {
    tax += (amount - 320000) * 0.35;
  }

  // Abattement 40% (Min 1000, Max 1500)
  let abatement = tax * 0.4;
  if (abatement < 1000) abatement = 1000;
  if (abatement > 1500) abatement = 1500;
  tax = Math.max(0, tax - abatement);

  // Lissage pour tranches 30k-35k (Formule DGI 2026)
  if (amount > 30000 && amount <= 35000) {
    tax = tax * (137/51) - (27925/8);
  }

  // Abattement spécifique Handicapé / Retraité (Art. 104 al. 2)
  if (isHandicapped) {
    // Abattement supplémentaire si revenu <= 42 500 DA
    if (amount <= 42500) {
      tax = tax * 0.5; // Simplification pour le prototype
    }
  }

  // Réduction Zone Sud (IZCV -50%)
  if (isGrandSud) tax *= 0.5;

  return Math.max(0, Math.round(tax));
}

export function calculateTVA(ht: number, type: 'TVA_19' | 'TVA_9' | 'TVA_EXONERE' = 'TVA_19', isIFU: boolean = false): number {
  if (isIFU || type === 'TVA_EXONERE') return 0;
  const rate = type === 'TVA_9' ? TAX_RATES.TVA_REDUIT : TAX_RATES.TVA_NORMAL;
  return Math.round(ht * rate * 100) / 100;
}

export function calculateStampDuty(totalTTC: number, isCash: boolean): number {
  if (!isCash) return 0;
  const duty = Math.ceil(totalTTC * 0.01);
  return Math.max(5, Math.min(2500, duty));
}

export function calculateIBS(profit: number, rate: number, reinvestedAmount: number = 0): number {
  if (profit <= 0) return 0;
  const base = Math.max(0, profit - reinvestedAmount);
  return Math.max(10000, Math.round(base * rate));
}

export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0;
  const tax = ca * rate;
  const min = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  return Math.max(min, Math.round(tax));
}

export function getIFURate(secteur: string, formeJuridique: string): number {
  if (formeJuridique === 'Auto-entrepreneur') return 0.005;
  if (secteur === 'PRODUCTION' || secteur === 'COMMERCE') return 0.05;
  return 0.12;
}

export function getIBSRate(secteur: string, activiteNAP?: string): number {
  if (secteur === 'INDUSTRIE' || secteur === 'PRODUCTION') return TAX_RATES.IBS_PRODUCTION;
  if (secteur === 'BTP') return TAX_RATES.IBS_BTP;
  if (secteur === 'SERVICES') return TAX_RATES.IBS_SERVICES;
  return TAX_RATES.IBS_NORMAL;
}
