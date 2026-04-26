/**
 * @fileOverview Utilitaires fiscaux et comptables Algérie 2026.
 */

export const TAUX_FISCAUX = {
  TVA_NORMAL:  0.19,
  TVA_REDUIT:  0.09,
  TVA_EXONERE: 0,
  TAP:         0,    // Supprimée depuis janvier 2024
  IBS_PRODUCTION: 0.19,
  IBS_SERVICES: 0.26,
} as const;

/**
 * Formate un montant en Dinar Algérien (DZD).
 */
export const formatDZD = (montant: number): string =>
  new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2,
  }).format(montant);

/**
 * Retourne la classe d'un compte SCF.
 */
export const getClasseCompte = (code: string): string => code.charAt(0);

/**
 * Identifie si un compte est une charge (Classe 6).
 */
export const isCompteCharge  = (code: string): boolean => getClasseCompte(code) === '6';

/**
 * Identifie si un compte est un produit (Classe 7).
 */
export const isCompteProduit = (code: string): boolean => getClasseCompte(code) === '7';

/**
 * Arrondi comptable standard à 2 décimales.
 */
export const roundComptable = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;
