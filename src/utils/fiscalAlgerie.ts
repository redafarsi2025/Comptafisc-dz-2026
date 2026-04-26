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

/**
 * Convertit un nombre en lettres (Français) pour les factures algériennes.
 */
export function numberToFrenchWords(amount: number): string {
  const main = Math.floor(amount);
  const cents = Math.round((amount - main) * 100);

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];

  function convert(n: number): string {
    if (n < 10) return units[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (u === 1 && t < 7) return tens[t] + "-et-un";
      if (t === 7) return "soixante-" + convert(n - 60);
      if (t === 9) return "quatre-vingt-" + convert(n - 80);
      return tens[t] + (u > 0 ? "-" + units[u] : "");
    }
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const r = n % 100;
      const part1 = c === 1 ? "cent" : units[c] + " cents";
      return part1 + (r > 0 ? " " + convert(r) : "");
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000);
      const r = n % 1000;
      const part1 = m === 1 ? "mille" : convert(m) + " mille";
      return part1 + (r > 0 ? " " + convert(r) : "");
    }
    return n.toString();
  }

  if (amount === 0) return "zéro dinar";
  
  let result = convert(main) + " dinars";
  if (cents > 0) {
    result += " et " + convert(cents) + " centimes";
  } else {
    result += " et zéro centimes";
  }

  return result.toUpperCase();
}

/**
 * Algorithme Tafqeet : Convertit un nombre en lettres (Arabe).
 * Adapté pour le Dinar Algérien.
 */
export function numberToArabicWords(amount: number): string {
  const main = Math.floor(amount);
  const cents = Math.round((amount - main) * 100);

  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const teens = ["أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function convert(n: number): string {
    if (n === 0) return "";
    if (n <= 10) return units[n];
    if (n < 20) return teens[n - 11];
    if (n < 100) {
      const u = n % 10;
      const t = Math.floor(n / 10);
      return (u > 0 ? units[u] + " و" : "") + tens[t];
    }
    if (n < 1000) {
      const r = n % 100;
      const h = Math.floor(n / 100);
      return hundreds[h] + (r > 0 ? " و" + convert(r) : "");
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000);
      const r = n % 1000;
      let mStr = "";
      if (m === 1) mStr = "ألف";
      else if (m === 2) mStr = "ألفان";
      else if (m >= 3 && m <= 10) mStr = units[m] + " آلاف";
      else mStr = convert(m) + " ألف";
      return mStr + (r > 0 ? " و" + convert(r) : "");
    }
    if (n < 1000000000) {
        const mil = Math.floor(n / 1000000);
        const r = n % 1000000;
        let milStr = "";
        if (mil === 1) milStr = "مليون";
        else if (mil === 2) milStr = "مليونان";
        else milStr = convert(mil) + " مليون";
        return milStr + (r > 0 ? " و" + convert(r) : "");
    }
    return n.toString();
  }

  if (amount === 0) return "صفر دينار";

  let result = convert(main) + " دينار جزائري";
  if (cents > 0) {
    result += " و " + convert(cents) + " سنتيم";
  } else {
    result += " و صفر سنتيم";
  }

  return result;
}
