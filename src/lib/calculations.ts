
/**
 * @fileOverview Moteur de Calcul (Refactoré pour injection dynamique)
 * Ce fichier conserve la logique de base mais délègue les valeurs au FiscalEngine.
 */

// --- Valeurs par défaut sécurisées (Version LF 2026) ---
// Note: Utilisées uniquement en chargement initial, le système privilégie Firestore.
export const STATIC_FALLBACK_2026 = {
  SNMG: 24000,
  IRG_EXEMPT: 30000,
  TVA_STD: 0.19,
  CASNOS_RATE: 0.15,
  IFU_STD: 0.12,
  IFU_PROD: 0.05
};

/**
 * Calculateur IRG Salarié - Version 2026
 * Note: Cette fonction sera progressivement remplacée par FiscalEngine.evaluateFiscalRule
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

  // Lissage pour tranches 30k-35k
  if (base > 30000 && base <= 35000) {
    net = net * (137/51) - (27925/8);
  }

  // Réduction Grand Sud
  if (isGrandSud) net *= 0.5;

  return Math.max(0, Math.round(net));
}

export function calculateTVA(ht: number, rate: number = 0.19, isExempt: boolean = false): number {
  if (isExempt) return 0;
  return Math.round(ht * rate * 100) / 100;
}

export function calculateStampDuty(totalTTC: number, isCash: boolean): number {
  if (!isCash) return 0;
  const duty = Math.ceil(totalTTC * 0.01);
  return Math.max(5, Math.min(2500, duty));
}
