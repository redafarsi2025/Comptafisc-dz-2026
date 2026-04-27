
/**
 * @fileOverview Référentiel des Modèles de Plan Comptable par Secteur (SCF Algérie 2026).
 * Inclut les libellés bilingues et la segmentation par activité.
 */

export interface AccountTemplateLine {
  number: string;
  label: string;
  labelAr: string;
  type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
  class: number;
}

/**
 * RÉFÉRENTIEL COMMUN SCF - BASE LÉGALE
 */
export const COMMON_ACCOUNTS: AccountTemplateLine[] = [
  // CLASSE 1 — CAPITAUX
  { number: '10', label: 'Capital et réserves', labelAr: 'رأس المال والاحتياطات', type: 'PASSIF', class: 1 },
  { number: '101', label: 'Capital social', labelAr: 'رأس المال', type: 'PASSIF', class: 1 },
  { number: '106', label: 'Réserves', labelAr: 'احتياطات', type: 'PASSIF', class: 1 },
  { number: '11', label: 'Report à nouveau', labelAr: 'النتائج المرحلة', type: 'PASSIF', class: 1 },
  { number: '12', label: 'Résultat de l\'exercice', labelAr: 'نتيجة الدورة', type: 'PASSIF', class: 1 },
  { number: '13', label: 'Subventions d\'investissement', labelAr: 'إعانات الاستثمار', type: 'PASSIF', class: 1 },
  { number: '16', label: 'Emprunts et dettes assimilées', labelAr: 'قروض وديون', type: 'PASSIF', class: 1 },

  // CLASSE 2 — IMMOBILISATIONS
  { number: '20', label: 'Immobilisations incorporelles', labelAr: 'أصول غير ملموسة', type: 'ACTIF', class: 2 },
  { number: '203', label: 'Frais de recherche', labelAr: 'مصاريف البحث', type: 'ACTIF', class: 2 },
  { number: '205', label: 'Logiciels', labelAr: 'برمجيات', type: 'ACTIF', class: 2 },
  { number: '21', label: 'Immobilisations corporelles', labelAr: 'أصول ملموسة', type: 'ACTIF', class: 2 },
  { number: '211', label: 'Terrains', labelAr: 'أراضي', type: 'ACTIF', class: 2 },
  { number: '213', label: 'Constructions', labelAr: 'مباني', type: 'ACTIF', class: 2 },
  { number: '215', label: 'Matériel industriel', labelAr: 'معدات صناعية', type: 'ACTIF', class: 2 },
  { number: '218', label: 'Autres immobilisations', labelAr: 'أصول أخرى', type: 'ACTIF', class: 2 },
  { number: '23', label: 'Immobilisations en cours', labelAr: 'أصول قيد الإنجاز', type: 'ACTIF', class: 2 },
  { number: '28', label: 'Amortissements', labelAr: 'اهتلاكات', type: 'ACTIF', class: 2 },
  { number: '29', label: 'Dépréciations', labelAr: 'انخفاض القيمة', type: 'ACTIF', class: 2 },

  // CLASSE 4 — TIERS (Comptes communs)
  { number: '401', label: 'Fournisseurs', labelAr: 'موردون', type: 'PASSIF', class: 4 },
  { number: '404', label: 'Fournisseurs d\'immobilisations', labelAr: 'موردي الأصول', type: 'PASSIF', class: 4 },
  { number: '411', label: 'Clients', labelAr: 'عملاء', type: 'ACTIF', class: 4 },
  { number: '416', label: 'Clients douteux', labelAr: 'عملاء مشكوك فيهم', type: 'ACTIF', class: 4 },
  { number: '42', label: 'Personnel', labelAr: 'موظفون', type: 'PASSIF', class: 4 },
  { number: '43', label: 'Organismes sociaux', labelAr: 'هيئات اجتماعية', type: 'PASSIF', class: 4 },
  { number: '44', label: 'État', labelAr: 'الدولة', type: 'PASSIF', class: 4 },
  { number: '4456', label: 'TVA déductible', labelAr: 'رسم استرجاع', type: 'ACTIF', class: 4 },
  { number: '4457', label: 'TVA collectée', labelAr: 'رسم محصل', type: 'PASSIF', class: 4 },
  { number: '447', label: 'Autres impôts', labelAr: 'ضرائب أخرى', type: 'PASSIF', class: 4 },

  // CLASSE 5 — TRÉSORERIE
  { number: '50', label: 'Valeurs mobilières', labelAr: 'قيم مالية', type: 'ACTIF', class: 5 },
  { number: '512', label: 'Banque', labelAr: 'حساب بنكي', type: 'ACTIF', class: 5 },
  { number: '53', label: 'Caisse', labelAr: 'صندوق', type: 'ACTIF', class: 5 },
  { number: '58', label: 'Virements internes', labelAr: 'تحويلات داخلية', type: 'ACTIF', class: 5 },

  // CLASSE 6 — CHARGES (Détails généraux)
  { number: '61', label: 'Services extérieurs', labelAr: 'خدمات خارجية', type: 'CHARGE', class: 6 },
  { number: '615', label: 'Entretien', labelAr: 'صيانة', type: 'CHARGE', class: 6 },
  { number: '621', label: 'Personnel extérieur', labelAr: 'عمال خارجيين', type: 'CHARGE', class: 6 },
  { number: '63', label: 'Charges de personnel', labelAr: 'أجور', type: 'CHARGE', class: 6 },
  { number: '64', label: 'Impôts et taxes', labelAr: 'ضرائب ورسوم', type: 'CHARGE', class: 6 },
  { number: '65', label: 'Autres charges', labelAr: 'مصاريف أخرى', type: 'CHARGE', class: 6 },
  { number: '66', label: 'Charges financières', labelAr: 'مصاريف مالية', type: 'CHARGE', class: 6 },
  { number: '68', label: 'Dotations amortissements', labelAr: 'اهتلاكات', type: 'CHARGE', class: 6 },

  // CLASSE 7 — PRODUITS (Généraux)
  { number: '75', label: 'Autres produits', labelAr: 'إيرادات أخرى', type: 'PRODUIT', class: 7 },
  { number: '76', label: 'Produits financiers', labelAr: 'إيرادات مالية', type: 'PRODUIT', class: 7 },
  { number: '77', label: 'Produits exceptionnels', labelAr: 'إيرادات استثنائية', type: 'PRODUIT', class: 7 },
  { number: '78', label: 'Reprises', labelAr: 'استرجاعات', type: 'PRODUIT', class: 7 },
];

/**
 * RÉFÉRENTIELS PAR ACTIVITÉ (EXTENSIONS)
 */
export const SECTOR_TEMPLATES: Record<string, AccountTemplateLine[]> = {
  COMMERCE: [
    { number: '30', label: 'Marchandises', labelAr: 'بضائع', type: 'ACTIF', class: 3 },
    { number: '390', label: 'Dépréciation stocks', labelAr: 'انخفاض المخزون', type: 'ACTIF', class: 3 },
    { number: '607', label: 'Achats marchandises', labelAr: 'مشتريات البضائع', type: 'CHARGE', class: 6 },
    { number: '707', label: 'Ventes marchandises', labelAr: 'مبيعات البضائع', type: 'PRODUIT', class: 7 },
  ],
  SERVICES: [
    { number: '611', label: 'Sous-traitance', labelAr: 'مقاولة فرعية', type: 'CHARGE', class: 6 },
    { number: '613', label: 'Locations', labelAr: 'إيجارات', type: 'CHARGE', class: 6 },
    { number: '704', label: 'Prestations services', labelAr: 'خدمات', type: 'PRODUIT', class: 7 },
    { number: '706', label: 'Services', labelAr: 'خدمات', type: 'PRODUIT', class: 7 },
  ],
  INDUSTRIE: [
    { number: '31', label: 'Matières premières', labelAr: 'مواد أولية', type: 'ACTIF', class: 3 },
    { number: '32', label: 'Autres approvisionnements', labelAr: 'لوازم', type: 'ACTIF', class: 3 },
    { number: '33', label: 'En-cours de production', labelAr: 'إنتاج قيد الإنجاز', type: 'ACTIF', class: 3 },
    { number: '35', label: 'Produits finis', labelAr: 'منتجات تامة', type: 'ACTIF', class: 3 },
    { number: '601', label: 'Achats matières premières', labelAr: 'مواد أولية', type: 'CHARGE', class: 6 },
    { number: '602', label: 'Achats consommables', labelAr: 'لوازم', type: 'CHARGE', class: 6 },
    { number: '701', label: 'Produits finis', labelAr: 'منتجات تامة', type: 'PRODUIT', class: 7 },
    { number: '702', label: 'Produits intermédiaires', labelAr: 'منتجات وسيطة', type: 'PRODUIT', class: 7 },
  ],
  BTP: [
    { number: '33', label: 'En-cours travaux', labelAr: 'أشغال قيد الإنجاز', type: 'ACTIF', class: 3 },
    { number: '611', label: 'Sous-traitance', labelAr: 'مقاولة فرعية', type: 'CHARGE', class: 6 },
    { number: '624', label: 'Transport', labelAr: 'نقل', type: 'CHARGE', class: 6 },
    { number: '703', label: 'Ventes travaux', labelAr: 'أشغال', type: 'PRODUIT', class: 7 },
    { number: '704', label: 'Services travaux', labelAr: 'خدمات', type: 'PRODUIT', class: 7 },
  ],
  TRANSPORT: [
    { number: '2182', label: 'Matériel de transport', labelAr: 'معدات نقل', type: 'ACTIF', class: 2 },
    { number: '624', label: 'Carburant et transport', labelAr: 'وقود ونقل', type: 'CHARGE', class: 6 },
    { number: '706', label: 'Prestations transport', labelAr: 'خدمات النقل', type: 'PRODUIT', class: 7 },
  ],
  AGRICULTURE: [
    { number: '31', label: 'Stocks biologiques', labelAr: 'مخزون بيولوجي', type: 'ACTIF', class: 3 },
    { number: '601', label: 'Semences et engrais', labelAr: 'بذور وأسمدة', type: 'CHARGE', class: 6 },
    { number: '701', label: 'Produits agricoles', labelAr: 'منتجات زراعية', type: 'PRODUIT', class: 7 },
  ],
};

/**
 * Retourne le plan complet (Commun + Sectoriel)
 */
export function getCompletePlanForSector(sector: string): AccountTemplateLine[] {
  const extension = SECTOR_TEMPLATES[sector.toUpperCase()] || SECTOR_TEMPLATES['SERVICES'];
  return [...COMMON_ACCOUNTS, ...extension];
}
