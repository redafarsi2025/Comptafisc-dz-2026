/**
 * @fileOverview Noyau de calcul douanier pour l'Algérie (Version 2026 - Master Node).
 * Calcule CIF, Droits de Douane, DAPS, TVA Import, TCS (3%) et PRCT (2%).
 */

export interface CustomsImportInput {
  invoiceValue: number;
  transportCost: number;
  insuranceCost: number;
  dutyRate: number; // 0, 5, 15, 30%
  dapsRate: number; // Droit Additionnel Provisoire de Sauvegarde (0-30%)
  tvaRate: number; // Généralement 9% ou 19%
  extraFees: number; // Frais annexes (magasinage, transitaire)
}

export interface CustomsLiquidation {
  cif: number;          // Valeur en Douane (VD)
  customsDuty: number;  // DD
  daps: number;         // DAPS
  baseTVA: number;      // VD + DD + DAPS
  tvaImport: number;    // TVA
  tcs: number;          // Taxe de Conformité sur les Services (3% sur DD+DAPS+TVA)
  prct: number;         // Prélèvement à la Réception (2% sur VD)
  totalTaxes: number;   // Cumul DD+DAPS+TVA+TCS+PRCT
  totalCost: number;    // Coût global avec taxes
  landedCost: number;   // Coût de revient Stock (CIF + Taxes hors TVA récupérable + Frais)
}

/**
 * Calcule la liquidation douanière complète selon la doctrine 2026.
 */
export function calculateCustomsLiquidation(input: CustomsImportInput): CustomsLiquidation {
  // 1. Valeur en Douane (CIF)
  const cif = input.invoiceValue + input.transportCost + input.insuranceCost;

  // 2. Droits de Douane et DAPS (sur VD)
  const customsDuty = cif * (input.dutyRate / 100);
  const daps = cif * (input.dapsRate / 100);

  // 3. TVA (sur VD + DD + DAPS)
  const baseTVA = cif + customsDuty + daps;
  const tvaImport = baseTVA * (input.tvaRate / 100);

  // 4. TCS (3% sur le montant cumulé des taxes : DD + DAPS + TVA)
  // Note : C'est une taxe sur le service de liquidation
  const tcs = (customsDuty + daps + tvaImport) * 0.03;

  // 5. PRCT (2% sur la Valeur en Douane)
  const prct = cif * 0.02;

  // 6. Totaux
  const totalTaxes = customsDuty + daps + tvaImport + tcs + prct;
  const totalCost = cif + totalTaxes + input.extraFees;
  
  // Coût de revient = CIF + DD + DAPS + TCS + PRCT + Frais (TVA exclue si récupérable)
  const landedCost = cif + customsDuty + daps + tcs + prct + input.extraFees;

  return {
    cif,
    customsDuty,
    daps,
    baseTVA,
    tvaImport,
    tcs,
    prct,
    totalTaxes,
    totalCost,
    landedCost
  };
}

/**
 * Référentiel des codes SH10 (10 chiffres) conforme à la nomenclature nationale.
 * Taux par défaut basés sur conformepro.dz et DGD.
 */
export const SH_CODES = [
  { code: '8471300000', label: 'Ordinateurs Portables', duty: 5, daps: 0, tva: 19 },
  { code: '8517130000', label: 'Smartphones (Cellulaires)', duty: 30, daps: 30, tva: 19 },
  { code: '8703239010', label: 'Véhicules de Tourisme (Occasion)', duty: 30, daps: 0, tva: 19 },
  { code: '3004900000', label: 'Médicaments Conditionnés', duty: 5, daps: 0, tva: 9 },
  { code: '1001190000', label: 'Blé Dur (Semence)', duty: 5, daps: 0, tva: 0 },
  { code: '8535101000', label: 'Fusibles (tension > 1000V)', duty: 30, daps: 0, tva: 19 },
  { code: '3926909000', label: 'Ouvrages en Plastique (Autres)', duty: 30, daps: 60, tva: 19 },
];

export function findShCode(code: string) {
  return SH_CODES.find(s => s.code === code);
}
