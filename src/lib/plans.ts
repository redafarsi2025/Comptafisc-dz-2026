/**
 * Référentiel des Plans de ComptaFisc-DZ
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
      support: 'Email'
    },
    categories: [
      {
        title: 'COMPTABILITÉ',
        features: [
          { name: 'Facturation clients', included: 'yes' },
          { name: 'Scan OCR (IA)', included: 'limited', detail: '5 max' },
          { name: 'Gestion achats/ventes', included: 'limited' },
          { name: 'Relevé bancaire manuel', included: 'no' },
        ]
      },
      {
        title: 'FISCALITÉ',
        features: [
          { name: 'Calcul TVA auto', included: 'no' },
          { name: 'G50 pré-remplie', included: 'no' },
          { name: 'Alertes échéances', included: 'limited' },
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
      support: 'Email + Chat'
    },
    categories: [
      {
        title: 'COMPTABILITÉ',
        features: [
          { name: 'Facturation clients', included: 'yes' },
          { name: 'Scan OCR (IA)', included: 'yes', detail: '50 / mois' },
          { name: 'Gestion achats/ventes', included: 'yes' },
          { name: 'Relevé bancaire manuel', included: 'yes' },
        ]
      },
      {
        title: 'FISCALITÉ',
        features: [
          { name: 'Calcul TVA auto', included: 'yes' },
          { name: 'G50 pré-remplie', included: 'yes' },
          { name: 'Alertes échéances', included: 'yes' },
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
      support: 'Prioritaire'
    },
    categories: [
      {
        title: 'COMPTABILITÉ',
        features: [
          { name: 'Scan OCR (IA)', included: 'yes', detail: 'Illimité' },
          { name: 'Calcul IBS annuel', included: 'yes' },
          { name: 'Calcul TAP', included: 'yes' },
          { name: 'Trésorerie temps réel', included: 'yes' },
        ]
      },
      {
        title: 'PILOTAGE',
        features: [
          { name: 'Rapport mensuel auto', included: 'yes' },
          { name: 'Rentabilité projet', included: 'yes' },
          { name: 'Archivage sécurisé', included: 'yes' },
        ]
      }
    ]
  },
  {
    id: 'CABINET',
    name: 'CABINET',
    price: 'Sur devis',
    period: '',
    description: 'Gérer tous les clients efficacement.',
    color: 'bg-purple-700',
    limits: {
      invoices: 'Illimité',
      users: 'Illimité',
      companies: 'Illimité',
      storage: '100 GB',
      support: 'Dédié'
    },
    categories: [
      {
        title: 'MULTI-CLIENT',
        features: [
          { name: 'Portail multi-sociétés', included: 'yes' },
          { name: 'Déclarations groupées', included: 'yes' },
          { name: 'Collaboration client', included: 'yes' },
          { name: 'Rapprochement auto', included: 'yes' },
        ]
      }
    ]
  }
];
