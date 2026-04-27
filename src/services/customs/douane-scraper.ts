'use server';

import * as cheerio from 'cheerio';

/**
 * Interface pour les données tarifaires extraites.
 */
export interface ScrapedTariff {
  code: string;
  label: string;
  duty: number;
  tva: number;
  tcs: number;
  prct: number;
  found: boolean;
  source: string;
}

/**
 * Service de scraping pour ConformePro.dz
 * Extrait les taux DD, TVA, TCS, PRCT pour un code SH10.
 */
export async function scrapeFromConformePro(shCode: string): Promise<ScrapedTariff | null> {
  try {
    const cleanCode = shCode.replace(/\s/g, '');
    const targetUrl = `https://conformepro.dz/resources/tarif-douanier/sous-position/${cleanCode}/`;
    
    console.log(`[Scraper] Tentative d'extraction sur : ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 404) return { code: shCode, label: "", duty: 0, tva: 0, tcs: 0, prct: 0, found: false, source: targetUrl };
      throw new Error(`Source inaccessible (Status: ${response.status})`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraction du libellé (souvent dans un h1 ou h2 spécifique)
    const label = $('h1, h2').first().text().trim().replace(shCode, '').replace(/^-/, '').trim();

    // Logique d'extraction des taux dans les tableaux ou divs de ConformePro
    // On cherche les patterns "Droit de douane", "TVA", "TCS", "PRCT"
    let duty = 0;
    let tva = 19;
    let tcs = 3;
    let prct = 2;

    // Analyse de tous les éléments contenant du texte pour trouver les pourcentages
    $('td, span, div, p').each((_, el) => {
      const text = $(el).text().toUpperCase();
      const nextText = $(el).next().text().trim();
      
      // Extraction DD
      if (text.includes('DROIT DE DOUANE') || text.includes(' DD ')) {
        const match = (text + nextText).match(/(\d+)%/);
        if (match) duty = parseInt(match[1]);
      }
      
      // Extraction TVA
      if (text.includes('TVA')) {
        const match = (text + nextText).match(/(\d+)%/);
        if (match) tva = parseInt(match[1]);
      }

      // Extraction TCS (Souvent 3% par défaut)
      if (text.includes('TCS')) {
        const match = (text + nextText).match(/(\d+)%/);
        if (match) tcs = parseInt(match[1]);
      }

      // Extraction PRCT (Souvent 2% par défaut)
      if (text.includes('PRCT')) {
        const match = (text + nextText).match(/(\d+)%/);
        if (match) prct = parseInt(match[1]);
      }
    });

    return {
      code: shCode,
      label: label || "Produit importé",
      duty,
      tva,
      tcs,
      prct,
      found: true,
      source: targetUrl
    };

  } catch (error) {
    console.error("[Scraper Error ConformePro]:", error);
    return null;
  }
}

/**
 * Service de recherche en temps réel sur le portail officiel des douanes.
 */
export async function searchOfficialTariff(shCode: string) {
  try {
    const searchUrl = `https://www.douane.gov.dz/spip.php?page=tarif_douanier&rech_code=${shCode}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store'
    });

    if (!response.ok) throw new Error("Portail Douane inaccessible");

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const resultTable = $('.table-responsive table');
    if (resultTable.length === 0) return null;

    return {
      source: searchUrl,
      found: true,
      shCode,
      lastUpdate: new Date().toLocaleDateString()
    };
  } catch (error) {
    console.error("[Customs Scraper Error]:", error);
    return null;
  }
}
