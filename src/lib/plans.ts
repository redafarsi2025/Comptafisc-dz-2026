/**
 * Référentiel des Plans et Add-ons de ComptaFisc-DZ
 * Basé sur la philosophie : "Nous vendons la tranquillité d'esprit fiscale".
 */

export type PlanFeature = {
  name: string;
  included: 'yes' | 'no' | 'limited';
  detail?: string;
};

export type PlanCategory = {
  title: string;
  features: PlanFeature[];
};

export type PlanDefinition = {
  id: 'GRATUIT' | 'ESSENTIEL' | 'PRO' | 'CABINET';
  name: string;
  price: string;
  period: string;
  description: string;
  color: string;
  categories: PlanCategory[];
  limits: {
    invoices: string;
    users: string;
    companies: string;
    storage: string;
    support: string;
    vehicles: string;
  };
};

export const PLANS: PlanDefinition[] = [
  {
    id: 'GRATUIT',
    name: 'GRATUIT',
    price: '0',
    period: 'DA/mois',
    description: 'Tester sans risque et voir ce que c\'est.',
    color: 'bg-slate-500',
    limits: {
      invoices: '15 / mois',
      users: '1',
      companies: '1',
      storage: '500 MB',
      support: 'Email',
      vehicles: '1 véhicule'
    },
    categories: [
      {
        title: 'COMPTABILITÉ',
        features: [
          { name: 'Facturation clients', included: 'yes' },
          { name: 'Scan OCR (IA)', included: 'limited', detail: '5 max' },
          { name: 'Gestion achats/ventes', included: 'limited' },
        ]
      },
      {
        title: 'LOGISTIQUE & FLOTTE',
        features: [
          { name: 'Suivi véhicule unique', included: 'yes' },
          { name: 'Alertes maintenance', included: 'no' },
        ]
      },
      {
        title: 'GESTION DES STOCKS & IMMOBILISATIONS',
        features: [
          { name: 'Gestion des immobilisations', included: 'no' },
          { name: 'Gestion des stocks', included: 'no' },
        ]
      }
    ]
  },
  {
    id: 'ESSENTIEL',
    name: 'ESSENTIEL',
    price: '1 500',
    period: 'DA/mois',
    description: 'Être en règle et ne plus avoir peur du 20 du mois.',
    color: 'bg-blue-600',
    limits: {
      invoices: '200 / mois',
      users: '2',
      companies: '1',
      storage: '5 GB',
      support: 'Email + Chat',
      vehicles: '5 véhicules'
    },
    categories: [
      {
        title: 'FISCALITÉ',
        features: [
          { name: 'Calcul TVA auto', included: 'yes' },
          { name: 'G50 pré-remplie', included: 'yes' },
          { name: 'Alertes échéances', included: 'yes' },
        ]
      },
      {
        title: 'LOGISTIQUE & FLOTTE',
        features: [
          { name: 'Suivi multi-véhicules', included: 'yes' },
          { name: 'Carnet d\'entretien', included: 'yes' },
          { name: 'Saisie carburant', included: 'yes' },
        ]
      },
      {
        title: 'GESTION DES STOCKS & IMMOBILISATIONS',
        features: [
          { name: 'Gestion des immobilisations', included: 'yes' },
          { name: 'Gestion des stocks', included: 'no' },
        ]
      }
    ]
  },
  {
    id: 'PRO',
    name: 'PRO',
    price: '5 000',
    period: 'DA/mois',
    description: 'Optimiser sa fiscalité et piloter comme un grand.',
    color: 'bg-emerald-600',
    limits: {
      invoices: 'Illimité',
      users: '5',
      companies: '1',
      storage: '20 GB',
      support: 'Prioritaire',
      vehicles: 'Illimité'
    },
    categories: [
      {
        title: 'PILOTAGE',
        features: [
          { name: 'Rapport mensuel auto', included: 'yes' },
          { name: 'Rentabilité projet', included: 'yes' },
          { name: 'Archivage sécurisé', included: 'yes' },
        ]
      },
      {
        title: 'LOGISTIQUE AVANCÉE',
        features: [
          { name: 'Analyse d\'efficience (L/100)', included: 'yes' },
          { name: 'Rentabilité par véhicule', included: 'yes' },
          { name: 'Gestion des missions', included: 'yes' },
        ]
      },
      {
        title: 'GESTION DES STOCKS & IMMOBILISATIONS',
        features: [
          { name: 'Gestion des immobilisations', included: 'yes' },
          { name: 'Gestion des stocks', included: 'yes' },
        ]
      }
    ]
  },
  {
    id: 'CABINET',
    name: 'CABINET',
    price: '0', // Stratégie Trojan Horse : Gratuit pour l'expert
    period: 'DA/mois',
    description: 'Le Hub gratuit pour gérer tous vos clients.',
    color: 'bg-purple-700',
    limits: {
      invoices: 'Illimité',
      users: 'Illimité',
      companies: 'Illimité',
      storage: '100 GB',
      support: 'Dédié',
      vehicles: 'Illimité'
    },
    categories: [
      {
        title: 'MULTI-CLIENT',
        features: [
          { name: 'Portail multi-sociétés', included: 'yes' },
          { name: 'Déclarations groupées', included: 'yes' },
          { name: 'Audit de flotte client', included: 'yes' },
        ]
      },
      {
        title: 'GESTION DES STOCKS & IMMOBILISATIONS',
        features: [
          { name: 'Gestion des immobilisations', included: 'yes' },
          { name: 'Gestion des stocks', included: 'yes' },
        ]
      }
    ]
  }
];

export interface AddonService {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

export const PREMIUM_ADDONS: AddonService[] = [
  {
    id: 'OCR_UNLIMITED',
    name: 'OCR Vision Illimité',
    price: 1500,
    description: 'Capturez toutes vos factures sans limite via Gemini Vision.',
    icon: 'Zap'
  },
  {
    id: 'STORAGE_100GB',
    name: 'Archivage Légal 100 Go',
    price: 900,
    description: 'Stockage sécurisé pour 10 ans de pièces comptables.',
    icon: 'Database'
  },
  {
    id: 'PAYROLL_PRO',
    name: 'Module Paie Avancé',
    price: 2000,
    description: 'Génération DAS, DAC et fichiers XML Jibayatic/CNAS.',
    icon: 'Users'
  },
  {
    id: 'SEAD_STRATEGIC',
    name: 'IA SEAD Predictive',
    price: 3500,
    description: 'Analyses prospectives et simulations d\'optimisation IBS.',
    icon: 'Brain'
  }
];