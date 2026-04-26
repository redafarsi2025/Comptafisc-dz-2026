/**
 * @fileOverview Référentiel des Unités de Mesure et Moteur de Conversion.
 * Gère les catégories (Masse, Volume, etc.) et les facteurs de conversion vers l'unité de base.
 */

export type UnitCategory = 'MASS' | 'VOLUME' | 'COUNT' | 'LENGTH';

export interface Unit {
  code: string;
  label: string;
  category: UnitCategory;
  factor: number; // Facteur par rapport à l'unité de base (ex: si base KG, g = 0.001)
  isBase?: boolean;
}

export const UNITS: Unit[] = [
  // MASSE (Base: KG)
  { code: 'KG', label: 'Kilogramme (kg)', category: 'MASS', factor: 1, isBase: true },
  { code: 'G', label: 'Gramme (g)', category: 'MASS', factor: 0.001 },
  { code: 'MG', label: 'Milligramme (mg)', category: 'MASS', factor: 0.000001 },
  { code: 'T', label: 'Tonne (t)', category: 'MASS', factor: 1000 },

  // VOLUME (Base: L)
  { code: 'L', label: 'Litre (l)', category: 'VOLUME', factor: 1, isBase: true },
  { code: 'ML', label: 'Millilitre (ml)', category: 'VOLUME', factor: 0.001 },
  { code: 'CL', label: 'Centilitre (cl)', category: 'VOLUME', factor: 0.01 },
  { code: 'M3', label: 'Mètre Cube (m3)', category: 'VOLUME', factor: 1000 },

  // COMPTE (Base: U)
  { code: 'U', label: 'Unité (u)', category: 'COUNT', factor: 1, isBase: true },
  { code: 'DZ', label: 'Douzaine', category: 'COUNT', factor: 12 },
  { code: 'CARTON', label: 'Carton', category: 'COUNT', factor: 1 },

  // LONGUEUR (Base: M)
  { code: 'M', label: 'Mètre (m)', category: 'LENGTH', factor: 1, isBase: true },
  { code: 'CM', label: 'Centimètre (cm)', category: 'LENGTH', factor: 0.01 },
  { code: 'MM', label: 'Millimètre (mm)', category: 'LENGTH', factor: 0.001 },
];

/**
 * Convertit une quantité d'une unité vers une autre.
 * Retourne la quantité originale si les unités sont incompatibles.
 */
export function convertQuantity(qty: number, fromCode: string, toCode: string): number {
  const fromUnit = UNITS.find(u => u.code === fromCode);
  const toUnit = UNITS.find(u => u.code === toCode);

  if (!fromUnit || !toUnit || fromUnit.category !== toUnit.category) {
    return qty;
  }

  // Conversion vers la base, puis vers la cible
  const baseQty = qty * fromUnit.factor;
  return baseQty / toUnit.factor;
}

/**
 * Retourne toutes les unités compatibles avec un code donné.
 */
export function getCompatibleUnits(code: string): Unit[] {
  const unit = UNITS.find(u => u.code === code);
  if (!unit) return [];
  return UNITS.filter(u => u.category === unit.category);
}

/**
 * Calcule le coût d'une quantité donnée dans une unité spécifique,
 * sachant que le prix unitaire est fourni pour une autre unité (souvent la base).
 */
export function calculateConvertedCost(qty: number, targetUnitCode: string, unitPrice: number, priceUnitCode: string): number {
  const qtyInPriceUnit = convertQuantity(qty, targetUnitCode, priceUnitCode);
  return qtyInPriceUnit * unitPrice;
}
