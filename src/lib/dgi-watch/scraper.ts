
'use server';

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { PublicationCategory } from './types';

const DGI_ACTU_URL = 'https://www.mfdgi.gov.dz/fr/a-propos/actu-fr/';
const DGI_FALLBACK_URL = 'https://www.mfdgi.gov.dz/fr/';

/**
 * Scrape le site de la DGI pour trouver les dernières publications.
 * Cette version est ultra-résiliente face aux changements de structure.
 */
export async function scrapeDgiNews() {
  try {
    console.log(`[DGI Scraper] Tentative d'accès à ${DGI_ACTU_URL}...`);
    
    let response = await fetch(DGI_ACTU_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, id=G-XXXXXXXX) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    // Si l'URL principale échoue, on tente la racine
    if (!response.ok) {
      console.warn(`[DGI Scraper] URL principale inaccessible (${response.status}). Tentative sur le fallback...`);
      response = await fetch(DGI_FALLBACK_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      });
    }

    if (!response.ok) {
      throw new Error(`Le site DGI est totalement inaccessible (Status: ${response.status})`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // 1. Stratégie A : Recherche par conteneurs connus
    const items = $('.items-row, .article-list-item, article, .item, .blog-item, div[id^="item-"], .news-item');
    
    items.each((_, el) => {
      const $el = $(el);
      const titleLink = $el.find('h2 a, h3 a, h1 a, .title a, a[href*="/fr/"]').first();
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      const dateStr = $el.find('.date, .published, time, .created, .date-published').first().text().trim();

      if (title && href && title.length > 10) {
        addResult(results, title, href, dateStr);
      }
    });

    // 2. Stratégie B : Si rien n'est trouvé, on scanne TOUS les liens significatifs
    if (results.length === 0) {
      console.log("[DGI Scraper] Stratégie A vide. Lancement du scan exhaustif des liens...");
      $('a[href*="/fr/"]').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href');
        // Un lien de news a généralement un titre long
        if (title.length > 35 && href) {
          addResult(results, title, href);
        }
      });
    }

    console.log(`[DGI Scraper] Fin du scrapping : ${results.length} résultats uniques trouvés.`);
    return results;
  } catch (error) {
    console.error('[DGI Scraper Error]:', error);
    return [];
  }
}

function addResult(results: any[], title: string, href: string, dateStr?: string) {
  const fullUrl = href.startsWith('http') ? href : `https://www.mfdgi.gov.dz${href}`;
  
  // Éviter les doublons et les pages de navigation
  const isDuplicate = results.find(r => r.url === fullUrl);
  const isNav = title.toLowerCase().includes('lire la suite') || title.toLowerCase().includes('en savoir plus');
  
  if (!isDuplicate && !isNav) {
    const id = createHash('sha256').update(fullUrl).digest('hex').substring(0, 16);
    results.push({
      id,
      url: fullUrl,
      title,
      publishedDate: dateStr || new Date().toISOString().split('T')[0],
      category: inferCategory(title),
      detectedAt: new Date().toISOString()
    });
  }
}

function inferCategory(title: string): PublicationCategory {
  const t = title.toLowerCase();
  if (t.includes('loi de finances')) return 'loi_finances';
  if (t.includes('circulaire')) return 'circulaire';
  if (t.includes('instruction')) return 'instruction';
  if (t.includes('communiqué')) return 'communique_special';
  if (t.includes('guide')) return 'guide';
  if (t.includes('avis')) return 'communique_declaration';
  return 'actualite';
}
