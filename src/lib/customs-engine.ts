/**
 * @fileOverview Noyau de calcul douanier pour l'Algérie.
 * Calcule CIF, Droits de Douane, DAPS et TVA Import.
 */

export interface CustomsImportInput {
  invoiceValue: number;
  transportCost: number;
  insuranceCost: number;
  dutyRate: number; // 0.05, 0.15, 0.30, etc.
  dapsRate: number; // Droit Additionnel Provisoire de Sauvegarde
  tvaRate: number; // Généralement 0.19
  extraFees: number;
}

export interface CustomsLiquidation {
  cif: number;
  customsDuty: number;
  daps: number;
  baseTVA: number;
  tvaImport: number;
  totalTaxes: number;
  totalCost: number;
  landedCost: number; // Coût de revient total (hors TVA récupérable)
}

/**
 * Calcule la liquidation douanière complète.
 */
export function calculateCustomsLiquidation(input: CustomsImportInput): CustomsLiquidation {
  const cif = input.invoiceValue + input.transportCost + input.insuranceCost;
  const customsDuty = cif * (input.dutyRate / 100);
  const daps = cif * (input.dapsRate / 100);
  const baseTVA = cif + customsDuty + daps;
  const tvaImport = baseTVA * (input.tvaRate / 100);
  
  const totalTaxes = customsDuty + daps + tvaImport;
  const totalCost = cif + totalTaxes + input.extraFees;
  const landedCost = cif + customsDuty + daps + input.extraFees; // La TVA est récupérable

  return {
    cif,
    customsDuty,
    daps,
    baseTVA,
    tvaImport,
    totalTaxes,
    totalCost,
    landedCost
  };
}

/**
 * Référentiel simplifié des codes SH (Harmonized System) courants en Algérie.
 */
export const SH_CODES = [
  { code: '8471', label: 'Ordinateurs & Serveurs', duty: 5, daps: 0 },
  { code: '8517', label: 'Smartphones & Télécoms', duty: 30, daps: 30 },
  { code: '8703', label: 'Véhicules de tourisme', duty: 30, daps: 0 },
  { code: '1001', label: 'Blé & Céréales', duty: 5, daps: 0 },
  { code: '3004', label: 'Médicaments', duty: 5, daps: 0 },
  { code: '3926', label: 'Articles en plastique', duty: 30, daps: 60 },
];

export function findShCode(code: string) {
  return SH_CODES.find(s => s.code === code);
}
