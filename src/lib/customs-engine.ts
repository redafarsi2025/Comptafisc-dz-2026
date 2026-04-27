/**
 * @fileOverview Noyau de calcul douanier pour l'Algérie (Version 2026 - Master Node).
 * Architecture découplée : les taux sont injectés depuis la configuration Cloud.
 */

export interface CustomsImportInput {
  invoiceValue: number;
  transportCost: number;
  insuranceCost: number;
  dutyRate: number; // DD
  dapsRate: number; // DAPS
  tvaRate: number; // TVA
  tcsRate: number; // TCS (ex: 0.03)
  prctRate: number; // PRCT (ex: 0.02)
  extraFees: number;
}

export interface CustomsLiquidation {
  cif: number;          
  customsDuty: number;  
  daps: number;         
  baseTVA: number;      
  tvaImport: number;    
  tcs: number;          
  prct: number;         
  totalTaxes: number;   
  totalCost: number;    
  landedCost: number;   
}

/**
 * Calcule la liquidation douanière complète selon les paramètres injectés.
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

  // 4. TCS (appliquée sur le cumul des taxes perçues)
  const tcs = (customsDuty + daps + tvaImport) * input.tcsRate;

  // 5. PRCT (sur la Valeur en Douane)
  const prct = cif * input.prctRate;

  // 6. Totaux
  const totalTaxes = customsDuty + daps + tvaImport + tcs + prct;
  const totalCost = cif + totalTaxes + input.extraFees;
  
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
