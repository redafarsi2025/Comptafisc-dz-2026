/**
 * @fileOverview Service de ventilation analytique Master Node.
 * Logique 100% client-side pour la répartition des montants.
 */

import { Ventilation, ValidationVentilationResult } from '@/types/analytique';

/**
 * Valide que les ventilations respectent les axes obligatoires et les sommes à 100%.
 */
export function validateVentilations(
  ventilations: Ventilation[],
  axesObligatoires: string[]
): ValidationVentilationResult {
  const result: ValidationVentilationResult = { valid: true, erreurs: [] };
  
  const axesPresent = new Set(ventilations.map(v => v.axeId));
  
  // 1. Vérifier la présence des axes obligatoires
  for (const axeId of axesObligatoires) {
    if (!axesPresent.has(axeId)) {
      result.valid = false;
      result.erreurs.push({ axeCode: axeId, message: "L'axe est obligatoire pour cette imputation." });
    }
  }

  // 2. Vérifier que la somme par axe est bien 100%
  const sumsByAxe: Record<string, number> = {};
  ventilations.forEach(v => {
    sumsByAxe[v.axeId] = (sumsByAxe[v.axeId] || 0) + v.pourcentage;
  });

  for (const axeId in sumsByAxe) {
    if (Math.abs(sumsByAxe[axeId] - 100) > 0.01) {
      result.valid = false;
      result.erreurs.push({ axeCode: axeId, message: `Somme des pourcentages (${sumsByAxe[axeId]}%) différente de 100%.` });
    }
  }

  return result;
}

/**
 * Calcule les montants réels en DZD à partir des pourcentages.
 * Gère l'arrondi comptable et l'absorption de l'écart sur la dernière ligne.
 */
export function calculateVentilationAmounts(
  ventilations: Omit<Ventilation, 'montant'>[],
  totalAmount: number
): Ventilation[] {
  if (ventilations.length === 0) return [];

  const axes = Array.from(new Set(ventilations.map(v => v.axeId)));
  const results: Ventilation[] = [];

  axes.forEach(axeId => {
    const axeVentilations = ventilations.filter(v => v.axeId === axeId);
    let runningSum = 0;

    axeVentilations.forEach((v, idx) => {
      let amount = 0;
      if (idx === axeVentilations.length - 1) {
        // Le dernier absorbe l'écart d'arrondi
        amount = Math.round((totalAmount - runningSum) * 100) / 100;
      } else {
        amount = Math.round((totalAmount * v.pourcentage / 100) * 100) / 100;
        runningSum += amount;
      }
      results.push({ ...v, montant: amount });
    });
  });

  return results;
}
