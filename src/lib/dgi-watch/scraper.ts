
'use server';

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { PublicationCategory } from './types';

// Constantes internes au fichier "use server" pour éviter l'export d'objets non asynchrones
const DGI_ACTU_URL = 'https://www.mfdgi.gov.dz/fr/a-propos/actu-fr/';

/**
 * Scrape le site de la DGI pour trouver les dernières publications
 */
export async function scrapeDgiNews() {
  try {
    const response = await fetch(DGI_ACTU_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) throw new Error('Impossible de contacter le site DGI');

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    $('.items-row, .article-list-item, article').each((_, el) => {
      const $el = $(el);
      const titleLink = $el.find('h2 a, h3 a, .title a').first();
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      const dateStr = $el.find('.date, .published, time').text().trim();

      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : `https://www.mfdgi.gov.dz${href}`;
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
    });

    return results;
  } catch (error) {
    console.error('DGI Scraper Error:', error);
    return [];
  }
}

// Fonction utilitaire interne
function inferCategory(title: string): PublicationCategory {
  const t = title.toLowerCase();
  if (t.includes('loi de finances')) return 'loi_finances';
  if (t.includes('circulaire')) return 'circulaire';
  if (t.includes('instruction')) return 'instruction';
  if (t.includes('communiqué')) return 'communique_special';
  if (t.includes('guide')) return 'guide';
  return 'actualite';
}
