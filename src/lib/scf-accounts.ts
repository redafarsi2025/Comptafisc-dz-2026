/**
 * Référentiel Officiel du Système Comptable Financier (SCF) Algérien.
 * Adapté pour le Plan de Comptes de l'Entité (PCE).
 */

export type SCF_Account = {
  code: string;
  name: string;
  category: string;
  class: number;
  isRoot?: boolean;
};

export const SCF_ACCOUNTS: SCF_Account[] = [
  // CLASSE 1 : COMPTES DE CAPITAUX
  { code: '10', name: 'Capital et réserves', category: 'Capitaux propres', class: 1, isRoot: true },
  { code: '101', name: 'Capital social', category: 'Capitaux propres', class: 1 },
  { code: '106', name: 'Réserves (Légale, Statutaire...)', category: 'Capitaux propres', class: 1 },
  { code: '12', name: 'Résultat de l\'exercice', category: 'Capitaux propres', class: 1, isRoot: true },
  { code: '16', name: 'Emprunts et dettes assimilées', category: 'Dettes financières', class: 1, isRoot: true },

  // CLASSE 2 : COMPTES D'IMMOBILISATIONS
  { code: '21', name: 'Immobilisations corporelles', category: 'Immobilisations', class: 2, isRoot: true },
  { code: '213', name: 'Constructions', category: 'Immobilisations', class: 2 },
  { code: '215', name: 'Installations techniques, matériel et outillage', category: 'Immobilisations', class: 2 },
  { code: '231', name: 'Immobilisations corporelles en cours (Chantiers)', category: 'Immobilisations', class: 2 },

  // CLASSE 3 : COMPTES DE STOCKS ET EN-COURS
  { code: '30', name: 'Stocks de marchandises', category: 'Stocks', class: 3, isRoot: true },
  { code: '31', name: 'Matières premières et fournitures', category: 'Stocks', class: 3, isRoot: true },
  { code: '33', name: 'En-cours de production (Travaux/Services)', category: 'Stocks', class: 3, isRoot: true },
  { code: '35', name: 'Stocks de produits finis', category: 'Stocks', class: 3, isRoot: true },

  // CLASSE 4 : COMPTES DE TIERS
  { code: '40', name: 'Fournisseurs et comptes rattachés', category: 'Tiers', class: 4, isRoot: true },
  { code: '401', name: 'Fournisseurs de stocks et services', category: 'Tiers', class: 4 },
  { code: '41', name: 'Clients et comptes rattachés', category: 'Tiers', class: 4, isRoot: true },
  { code: '411', name: 'Clients', category: 'Tiers', class: 4 },
  { code: '44', name: 'État, collectivités publiques', category: 'Fiscal', class: 4, isRoot: true },
  { code: '4456', name: 'TVA déductible', category: 'Fiscal', class: 4 },
  { code: '4457', name: 'TVA collectée', category: 'Fiscal', class: 4 },

  // CLASSE 5 : COMPTES FINANCIERS
  { code: '512', name: 'Banques (Comptes courants)', category: 'Trésorerie', class: 5 },
  { code: '53', name: 'Caisse', category: 'Trésorerie', class: 5, isRoot: true },

  // CLASSE 6 : COMPTES DE CHARGES
  { code: '60', name: 'Achats consommés', category: 'Charges', class: 6, isRoot: true },
  { code: '607', name: 'Achats non stockés de matières et fournitures', category: 'Charges', class: 6 },
  { code: '63', name: 'Charges de personnel', category: 'Charges', class: 6, isRoot: true },

  // CLASSE 7 : COMPTES DE PRODUITS
  { code: '70', name: 'Ventes de marchandises et produits fabriqués', category: 'Produits', class: 7, isRoot: true },
  { code: '700', name: 'Ventes de marchandises', category: 'Produits', class: 7 },
  { code: '701', name: 'Travaux (BTP Situations)', category: 'Produits', class: 7 },
  { code: '706', name: 'Prestations de services / Honoraires', category: 'Produits', class: 7 },
];

export const ACCOUNTING_TEMPLATES = [
  {
    id: 'loyer',
    name: 'Paiement Loyer',
    journal: 'ACHATS',
    description: 'Loyer mensuel',
    lines: [
      { accountCode: '613', debit: 1, credit: 0 },
      { accountCode: '4456', debit: 1, credit: 0 },
      { accountCode: '401', debit: 0, credit: 1 },
    ]
  },
];

export type JournalType = 'ACHATS' | 'VENTES' | 'BANQUE' | 'CAISSE' | 'OD';

export type JournalEntryLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type JournalEntry = {
  id?: string;
  tenantId: string;
  entryDate: string;
  description: string;
  documentReference: string;
  journalType: JournalType;
  status: 'Draft' | 'Validated';
  lines: JournalEntryLine[];
  createdAt: string;
  createdByUserId: string;
  tenantMembers: any;
};
