
'use server';

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { PublicationCategory } from './types';

const DGI_ACTU_URL = 'https://www.mfdgi.gov.dz/fr/a-propos/actu-fr/';

/**
 * Scrape le site de la DGI pour trouver les dernières publications.
 * Cette version est optimisée pour la structure actuelle du portail MF DGI Algérie.
 */
export async function scrapeDgiNews() {
  try {
    console.log(`[DGI Scraper] Interrogation de ${DGI_ACTU_URL}...`);
    
    const response = await fetch(DGI_ACTU_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store' // Éviter le cache NextJS pendant les tests de structure
    });

    if (!response.ok) {
      throw new Error(`Le site DGI a répondu avec le statut : ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Sélecteurs élargis pour couvrir toutes les variantes possibles du site
    // Le site DGI utilise souvent des structures de type blog (div.item, div.items-row)
    const items = $('.items-row, .article-list-item, article, .item, .blog-item, div[id^="item-"]');
    
    console.log(`[DGI Scraper] ${items.length} conteneurs d'articles potentiels trouvés.`);

    items.each((_, el) => {
      const $el = $(el);
      
      // Recherche du lien de titre
      const titleLink = $el.find('h2 a, h3 a, h1 a, .title a, a[href*="/fr/"]').first();
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      
      // Recherche de la date (souvent dans .published, .created, .date-published ou time)
      const dateStr = $el.find('.date, .published, time, .created, .date-published, .article-info dd').first().text().trim();

      if (title && href && title.length > 5) {
        const fullUrl = href.startsWith('http') ? href : `https://www.mfdgi.gov.dz${href}`;
        const id = createHash('sha256').update(fullUrl).digest('hex').substring(0, 16);
        
        // Détecter si l'article est déjà dans les résultats (doublons de sélecteurs)
        if (!results.find(r => r.url === fullUrl)) {
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
    });

    // Si aucun résultat via les sélecteurs de conteneurs, tentative désespérée sur tous les liens /fr/
    if (results.length === 0) {
      console.log("[DGI Scraper] Tentative de secours sur tous les liens...");
      $('a[href*="/fr/"]').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href');
        if (title.length > 30 && href) { // Un titre long est probablement une news
          const fullUrl = href.startsWith('http') ? href : `https://www.mfdgi.gov.dz${href}`;
          const id = createHash('sha256').update(fullUrl).digest('hex').substring(0, 16);
          if (!results.find(r => r.url === fullUrl)) {
            results.push({
              id,
              url: fullUrl,
              title,
              publishedDate: new Date().toISOString().split('T')[0],
              category: 'actualite',
              detectedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log(`[DGI Scraper] Fin du scrapping : ${results.length} résultats uniques.`);
    return results;
  } catch (error) {
    console.error('[DGI Scraper Error]:', error);
    return [];
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
