export const SCF_ACCOUNTS = [
  // Classe 1 : Comptes de capitaux
  { code: '101', name: 'Capital social', category: 'Capitaux propres' },
  { code: '106', name: 'Réserves', category: 'Capitaux propres' },
  { code: '12', name: 'Résultat de l\'exercice', category: 'Capitaux propres' },
  
  // Classe 2 : Comptes d'immobilisations
  { code: '211', name: 'Terrains', category: 'Immobilisations' },
  { code: '213', name: 'Constructions', category: 'Immobilisations' },
  { code: '215', name: 'Installations techniques', category: 'Immobilisations' },
  { code: '218', name: 'Autres immobilisations corporelles', category: 'Immobilisations' },
  
  // Classe 3 : Comptes de stocks
  { code: '30', name: 'Stocks de marchandises', category: 'Stocks' },
  { code: '31', name: 'Matières premières et fournitures', category: 'Stocks' },
  
  // Classe 4 : Comptes de tiers
  { code: '401', name: 'Fournisseurs de stocks et services', category: 'Tiers' },
  { code: '411', name: 'Clients', category: 'Tiers' },
  { code: '421', name: 'Personnel - Rémunérations dues', category: 'Tiers' },
  { code: '431', name: 'Collectivités publiques (CNAS/CASNOS)', category: 'Tiers' },
  { code: '4455', name: 'TVA à décaisser', category: 'Tiers' },
  { code: '4456', name: 'TVA déductible', category: 'Tiers' },
  { code: '4457', name: 'TVA collectée', category: 'Tiers' },
  
  // Classe 5 : Comptes financiers
  { code: '512', name: 'Banques', category: 'Financier' },
  { code: '53', name: 'Caisse', category: 'Financier' },
  
  // Classe 6 : Comptes de charges
  { code: '607', name: 'Achats de marchandises', category: 'Charges' },
  { code: '61', name: 'Services extérieurs', category: 'Charges' },
  { code: '63', name: 'Charges de personnel', category: 'Charges' },
  { code: '66', name: 'Charges financières', category: 'Charges' },
  
  // Classe 7 : Comptes de produits
  { code: '701', name: 'Ventes de produits finis', category: 'Produits' },
  { code: '707', name: 'Ventes de marchandises', category: 'Produits' },
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
