
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

export const COMMON_ACCOUNTS: AccountTemplateLine[] = [
  { number: '101', label: 'Capital social', labelAr: 'رأس مال الشركة', type: 'PASSIF', class: 1 },
  { number: '120', label: 'Résultat de l\'exercice', labelAr: 'نتيجة السنة المالية', type: 'PASSIF', class: 1 },
  { number: '401', label: 'Fournisseurs de stocks et services', labelAr: 'موردي المخزونات والخدمات', type: 'PASSIF', class: 4 },
  { number: '411', label: 'Clients', labelAr: 'الزبائن', type: 'ACTIF', class: 4 },
  { number: '445', label: 'TVA', labelAr: 'الرسم على القيمة المضافة', type: 'PASSIF', class: 4 },
  { number: '4456', label: 'TVA déductible', labelAr: 'الرسم على القيمة المضافة القابل للاسترجاع', type: 'ACTIF', class: 4 },
  { number: '4457', label: 'TVA collectée', labelAr: 'الرسم على القيمة المضافة المحصل', type: 'PASSIF', class: 4 },
  { number: '512', label: 'Banques', labelAr: 'البنوك', type: 'ACTIF', class: 5 },
  { number: '53', label: 'Caisse', labelAr: 'الصندوق', type: 'ACTIF', class: 5 },
];

export const SECTOR_TEMPLATES: Record<string, AccountTemplateLine[]> = {
  COMMERCE: [
    { number: '30', label: 'Marchandises', labelAr: 'بضائع', type: 'ACTIF', class: 3 },
    { number: '380', label: 'Stocks en cours', labelAr: 'مخزونات قيد التنفيذ', type: 'ACTIF', class: 3 },
    { number: '390', label: 'Dépréciation stocks', labelAr: 'تدني قيمة المخزونات', type: 'ACTIF', class: 3 },
    { number: '607', label: 'Achats de marchandises', labelAr: 'مشتريات البضائع', type: 'CHARGE', class: 6 },
    { number: '608', label: 'Frais accessoires d’achat', labelAr: 'مصاريف الشراء الملحقة', type: 'CHARGE', class: 6 },
    { number: '707', label: 'Ventes de marchandises', labelAr: 'مبيعات البضائع', type: 'PRODUIT', class: 7 },
  ],
  SERVICES: [
    { number: '611', label: 'Sous-traitance générale', labelAr: 'المقاولة الثانوية العامة', type: 'CHARGE', class: 6 },
    { number: '613', label: 'Locations', labelAr: 'الإيجارات', type: 'CHARGE', class: 6 },
    { number: '621', label: 'Personnel extérieur', labelAr: 'المستخدمون الخارجيون', type: 'CHARGE', class: 6 },
    { number: '706', label: 'Prestations de services', labelAr: 'تقديم الخدمات', type: 'PRODUIT', class: 7 },
  ],
  INDUSTRIE: [
    { number: '31', label: 'Matières premières', labelAr: 'مواد أولية', type: 'ACTIF', class: 3 },
    { number: '32', label: 'Autres approvisionnements', labelAr: 'تموينات أخرى', type: 'ACTIF', class: 3 },
    { number: '33', label: 'En-cours de production', labelAr: 'منتجات قيد التنفيذ', type: 'ACTIF', class: 3 },
    { number: '35', label: 'Produits finis', labelAr: 'منتجات مصنعة', type: 'ACTIF', class: 3 },
    { number: '601', label: 'Achats matières premières', labelAr: 'مشتريات مواد أولية', type: 'CHARGE', class: 6 },
    { number: '602', label: 'Achats consommables', labelAr: 'مشتريات التموينات الأخرى', type: 'CHARGE', class: 6 },
    { number: '701', label: 'Ventes produits finis', labelAr: 'مبيعات منتجات مصنعة', type: 'PRODUIT', class: 7 },
  ],
  BTP: [
    { number: '33', label: 'En-cours travaux', labelAr: 'أشغال قيد التنفيذ', type: 'ACTIF', class: 3 },
    { number: '335', label: 'Travaux en cours', labelAr: 'أشغال جارية', type: 'ACTIF', class: 3 },
    { number: '611', label: 'Sous-traitance chantier', labelAr: 'المقاولة الثانوية للأشغال', type: 'CHARGE', class: 6 },
    { number: '624', label: 'Transport chantier', labelAr: 'نقل الأشغال', type: 'CHARGE', class: 6 },
    { number: '631', label: 'Salaires chantier', labelAr: 'أجور الأشغال', type: 'CHARGE', class: 6 },
    { number: '704', label: 'Travaux', labelAr: 'أشغال', type: 'PRODUIT', class: 7 },
    { number: '705', label: 'Études', labelAr: 'دراسات', type: 'PRODUIT', class: 7 },
  ],
  TRANSPORT: [
    { number: '2182', label: 'Matériel de transport (Véhicules)', labelAr: 'معدات النقل', type: 'ACTIF', class: 2 },
    { number: '613', label: 'Location véhicules', labelAr: 'إيجار المركبات', type: 'CHARGE', class: 6 },
    { number: '615', label: 'Entretien véhicules', labelAr: 'صيانة المركبات', type: 'CHARGE', class: 6 },
    { number: '624', label: 'Carburant', labelAr: 'الوقود', type: 'CHARGE', class: 6 },
    { number: '635', label: 'Assurances', labelAr: 'التأمينات', type: 'CHARGE', class: 6 },
    { number: '706', label: 'Prestations transport', labelAr: 'خدمات النقل', type: 'PRODUIT', class: 7 },
  ],
  AGRICULTURE: [
    { number: '31', label: 'Produits agricoles', labelAr: 'منتجات زراعية', type: 'ACTIF', class: 3 },
    { number: '33', label: 'En-cours (culture)', labelAr: 'زراعة قيد التنفيذ', type: 'ACTIF', class: 3 },
    { number: '601', label: 'Semences', labelAr: 'بذور', type: 'CHARGE', class: 6 },
    { number: '602', label: 'Engrais', labelAr: 'أسمدة', type: 'CHARGE', class: 6 },
    { number: '615', label: 'Entretien matériel', labelAr: 'صيانة العتاد', type: 'CHARGE', class: 6 },
    { number: '621', label: 'Main d’œuvre', labelAr: 'اليد العاملة', type: 'CHARGE', class: 6 },
    { number: '701', label: 'Produits agricoles', labelAr: 'منتجات زراعية', type: 'PRODUIT', class: 7 },
    { number: '707', label: 'Ventes directes', labelAr: 'مبيعات مباشرة', type: 'PRODUIT', class: 7 },
  ],
};

export function getCompletePlanForSector(sector: string): AccountTemplateLine[] {
  const extension = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES['SERVICES'];
  return [...COMMON_ACCOUNTS, ...extension];
}
