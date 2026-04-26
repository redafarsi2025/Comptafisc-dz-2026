
/**
 * @fileOverview Moteur de Calcul (Refactoré pour injection dynamique)
 * Ce fichier contient les constantes et fonctions de base conformes à la LF 2026.
 */

// --- Constantes Fiscales & Sociales 2026 ---

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

// --- Fonctions de Résolution de Taux ---

export function getTAPRate(): number {
  // Supprimée pour toutes les activités depuis LF 2024
  return 0.00;
}

export function getIBSRate(secteur: string, activiteNAP?: string): number {
  if (secteur === 'INDUSTRIE' || secteur === 'PRODUCTION') return TAX_RATES.IBS_PRODUCTION;
  if (secteur === 'BTP') return TAX_RATES.IBS_BTP;
  if (secteur === 'SERVICES') return TAX_RATES.IBS_SERVICES;
  return TAX_RATES.IBS_NORMAL;
}

export function getIFURate(secteur: string, formeJuridique: string): number {
  if (formeJuridique === 'Auto-entrepreneur') return 0.005; // 0.5%
  if (secteur === 'PRODUCTION' || secteur === 'COMMERCE') return 0.05; // 5%
  return 0.12; // 12% pour les services
}

// --- Moteurs de Calcul ---

/**
 * Calculateur IRG Salarié - Version 2026
 * Applique le barème progressif, l'abattement lissé et l'exonération des 30k.
 */
export function calculateIRG(netImposable: number, isGrandSud: boolean = false, isHandicapped: boolean = false): number {
  const base = Math.floor(netImposable / 10) * 10;
  
  if (base <= 30000) return 0;

  let irgBrut = 0;
  if (base <= 40000) {
    irgBrut = (base - 20000) * 0.23;
  } else if (base <= 80000) {
    irgBrut = (40000 - 20000) * 0.23 + (base - 40000) * 0.27;
  } else if (base <= 160000) {
    irgBrut = 4600 + 10800 + (base - 80000) * 0.30;
  } else if (base <= 320000) {
    irgBrut = 4600 + 10800 + 24000 + (base - 160000) * 0.33;
  } else {
    irgBrut = 4600 + 10800 + 24000 + 52800 + (base - 320000) * 0.35;
  }

  // Abattement 40% (Min 1000, Max 1500)
  let abat = irgBrut * 0.4;
  if (abat < 1000) abat = 1000;
  if (abat > 1500) abat = 1500;

  let net = irgBrut - abat;

  // Lissage pour tranches 30k-35k (Formule DGI 2026)
  if (base > 30000 && base <= 35000) {
    net = net * (137/51) - (27925/8);
  }

  // Réduction Grand Sud (IZCV)
  if (isGrandSud) net *= 0.5;

  return Math.max(0, Math.round(net));
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
  const tax = base * rate;
  return Math.max(10000, tax); // Minimum fiscal 10 000 DA
}

export function calculateIFU(ca: number, rate: number, isAuto: boolean = false, isStartup: boolean = false): number {
  if (isStartup) return 0; // Exonération Startup
  const tax = ca * rate;
  const min = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  return Math.max(min, tax);
}

export function calculateCASNOS(annualBase: number): number {
  if (annualBase <= 0) return CASNOS_CONSTANTS.MIN_AMOUNT;
  const calculated = annualBase * CASNOS_CONSTANTS.RATE;
  return Math.max(CASNOS_CONSTANTS.MIN_AMOUNT, Math.min(CASNOS_CONSTANTS.MAX_AMOUNT, calculated));
}
