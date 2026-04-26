/**
 * @fileOverview Moteur de Reporting Analytique Master Node.
 * Agrégation en mémoire des écritures ventilées.
 */

import { EcritureAnalytique, ResultatSection } from '@/types/analytique';

/**
 * Agrège les données pour un axe donné sur une période définie.
 */
export function aggregateResultBySection(
  ecritures: EcritureAnalytique[],
  axeId: string
): ResultatSection[] {
  const sections: Record<string, ResultatSection> = {};

  ecritures.forEach(entry => {
    const vList = entry.ventilations.filter(v => v.axeId === axeId);
    
    vList.forEach(v => {
      if (!sections[v.sectionId]) {
        sections[v.sectionId] = {
          sectionId: v.sectionId,
          sectionCode: v.sectionCode,
          sectionLibelle: v.sectionLibelle,
          charges: 0,
          produits: 0,
          marge: 0,
          tauxMarge: 0
        };
      }

      if (entry.classeCompte === '6') {
        sections[v.sectionId].charges += v.montant;
      } else if (entry.classeCompte === '7') {
        sections[v.sectionId].produits += v.montant;
      }
    });
  });

  return Object.values(sections).map(s => {
    const marge = s.produits - s.charges;
    return {
      ...s,
      marge,
      tauxMarge: s.produits > 0 ? (marge / s.produits) * 100 : null
    };
  }).sort((a, b) => b.marge - a.marge);
}
