/**
 * @fileOverview Référentiel de traduction centralisé pour ComptaFisc-DZ.
 * Permet d'éviter les variables en dur et facilite la maintenance bilingue.
 */

export type Locale = 'fr' | 'ar';

export const TRANSLATIONS = {
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    analytics: "Analyse & Pilotage",
    contacts: "Registre des Tiers",
    crm: "Pipeline (CRM)",
    invoicing: "Saisie Facture / CA",
    sales_hub: "Flux de Vente Hub",
    orders: "Commandes Clients",
    delivery: "Livraisons (BL)",
    invoices: "Factures Émises",
    logistics: "Pilotage Flotte",
    fuel: "Consommation (Carburant)",
    maintenance: "Carnet d'Entretien",
    projects: "Suivi Chantiers",
    situations: "Situations de Travaux",
    assets: "Engins & Matériel",
    production: "Ordres de Fabrication",
    recipes: "Fiches Recettes",
    health_lots: "Traçabilité Lots",
    inventory_stock: "Catalogue Articles",
    inventory_sessions: "Sessions d'Inventaire",
    purchase_hub: "Flux d'Achat Hub",
    purchase_requests: "Demandes d'Achat",
    journal: "Saisie Journal",
    ledger: "Grand Livre",
    financial_statements: "États Financiers",
    analytic_reporting: "Pilotage Analytique",
    analytic_settings: "Architecture Analytique",
    payroll_register: "Registre Personnel",
    payroll_compliance: "Audit & Conformité",
    payroll_ledger: "Livre de Paie",
    declarations: "Déclarations (G50/G12)",
    etat104: "État 104 (Ventes)",
    liasse_g4: "Liasse Fiscale (G4)",
    support: "Assistance & Support",
    settings: "Paramètres Dossier",
    
    // UI common
    search: "Rechercher...",
    logout: "Déconnexion",
    profile: "Mon Profil",
    new_dossier: "Nouveau Dossier",
    certified: "CERTIFIÉ LF 2026",
    status_compliance: "Statut Conformité",
  },
  ar: {
    // Navigation
    dashboard: "لوحة القيادة",
    analytics: "التحليل والتوجيه",
    contacts: "سجل المتعاملين",
    crm: "إدارة المبيعات",
    invoicing: "تسجيل الفواتير",
    sales_hub: "مركز المبيعات",
    orders: "طلبيات الزبائن",
    delivery: "وصولات التسليم",
    invoices: "الفواتير الصادرة",
    logistics: "تسيير الأسطول",
    fuel: "استهلاك الوقود",
    maintenance: "دفتر الصيانة",
    projects: "متابعة المشاريع",
    situations: "كشوف الأشغال",
    assets: "الآليات والمعدات",
    production: "أوامر التصنيع",
    recipes: "بطاقات الوصفات",
    health_lots: "تتبع الحصص",
    inventory_stock: "فهرس المنتجات",
    inventory_sessions: "جلسات الجرد",
    purchase_hub: "مركز المشتريات",
    purchase_requests: "طلبات الشراء",
    journal: "دفتر اليومية",
    ledger: "دفتر الأستاذ",
    financial_statements: "القوائم المالية",
    analytic_reporting: "التوجيه التحليلي",
    analytic_settings: "هيكلة التحليل",
    payroll_register: "سجل الموظفين",
    payroll_compliance: "التدقيق والمطابقة",
    payroll_ledger: "دفتر الرواتب",
    declarations: "التصريحات (G50/G12)",
    etat104: "كشف رقم 104",
    liasse_g4: "الحزمة الجبائية (G4)",
    support: "الدعم والمساعدة",
    settings: "إعدادات الملف",

    // UI common
    search: "بحث...",
    logout: "تسجيل الخروج",
    profile: "حسابي",
    new_dossier: "ملف جديد",
    certified: "معتمد قانون المالية 2026",
    status_compliance: "حالة المطابقة",
  }
};

export type TranslationKeys = keyof typeof TRANSLATIONS.fr;
