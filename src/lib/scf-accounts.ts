export const SCF_ACCOUNTS = [
  { code: '101', name: 'Capital social', category: 'Capitaux propres' },
  { code: '211', name: 'Terrains', category: 'Immobilisations corporelles' },
  { code: '401', name: 'Fournisseurs de stocks et services', category: 'Tiers' },
  { code: '411', name: 'Clients', category: 'Tiers' },
  { code: '4455', name: 'TVA à décaisser', category: 'Tiers' },
  { code: '4456', name: 'TVA déductible', category: 'Tiers' },
  { code: '512', name: 'Banques', category: 'Comptes financiers' },
  { code: '531', name: 'Caisse', category: 'Comptes financiers' },
  { code: '607', name: 'Achats de marchandises', category: 'Charges' },
  { code: '701', name: 'Ventes de produits finis', category: 'Produits' },
  { code: '707', name: 'Ventes de marchandises', category: 'Produits' },
];

export type JournalEntryLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};