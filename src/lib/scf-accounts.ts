/**
 * Référentiel Officiel du Système Comptable Financier (SCF) Algérien.
 * Source de vérité pour la nomenclature des comptes (Classes 1 à 7).
 */

export type SCF_Account = {
  code: string;
  name: string;
  category: string;
  class: number;
};

export const SCF_ACCOUNTS: SCF_Account[] = [
  // CLASSE 1 : COMPTES DE CAPITAUX
  { code: '101', name: 'Capital social', category: 'Capitaux propres', class: 1 },
  { code: '106', name: 'Réserves (Légale, Statutaire...)', category: 'Capitaux propres', class: 1 },
  { code: '108', name: 'Compte de l\'exploitant', category: 'Capitaux propres', class: 1 },
  { code: '11', name: 'Report à nouveau', category: 'Capitaux propres', class: 1 },
  { code: '12', name: 'Résultat de l\'exercice', category: 'Capitaux propres', class: 1 },
  { code: '13', name: 'Produits et charges différés', category: 'Capitaux propres', class: 1 },
  { code: '16', name: 'Emprunts et dettes assimilées', category: 'Dettes financières', class: 1 },

  // CLASSE 2 : COMPTES D'IMMOBILISATIONS
  { code: '20', name: 'Immobilisations incorporelles (Frais de dév, Logiciels...)', category: 'Immobilisations', class: 2 },
  { code: '211', name: 'Terrains', category: 'Immobilisations', class: 2 },
  { code: '213', name: 'Constructions', category: 'Immobilisations', class: 2 },
  { code: '215', name: 'Installations techniques, matériel et outillage', category: 'Immobilisations', class: 2 },
  { code: '218', name: 'Autres immobilisations corporelles (Matériel transport, bureau...)', category: 'Immobilisations', class: 2 },
  { code: '23', name: 'Immobilisations en cours', category: 'Immobilisations', class: 2 },
  { code: '28', name: 'Amortissements des immobilisations', category: 'Amortissements', class: 2 },

  // CLASSE 3 : COMPTES DE STOCKS ET EN-COURS
  { code: '30', name: 'Stocks de marchandises', category: 'Stocks', class: 3 },
  { code: '31', name: 'Matières premières et fournitures', category: 'Stocks', class: 3 },
  { code: '32', name: 'Autres approvisionnements', category: 'Stocks', class: 3 },
  { code: '35', name: 'Stocks de produits', category: 'Stocks', class: 3 },
  { code: '38', name: 'Achats stockés', category: 'Stocks', class: 3 },

  // CLASSE 4 : COMPTES DE TIERS
  { code: '401', name: 'Fournisseurs de stocks et services', category: 'Tiers', class: 4 },
  { code: '404', name: 'Fournisseurs d\'immobilisations', category: 'Tiers', class: 4 },
  { code: '411', name: 'Clients', category: 'Tiers', class: 4 },
  { code: '421', name: 'Personnel - Rémunérations dues', category: 'Social', class: 4 },
  { code: '425', name: 'Personnel - Avances et acomptes', category: 'Social', class: 4 },
  { code: '431', name: 'Collectivités publiques (CNAS / CASNOS)', category: 'Social', class: 4 },
  { code: '442', name: 'État, impôts et taxes retenus à la source (IRG)', category: 'Fiscal', class: 4 },
  { code: '444', name: 'État, impôts sur les bénéfices (IBS)', category: 'Fiscal', class: 4 },
  { code: '4455', name: 'TVA à décaisser', category: 'Fiscal', class: 4 },
  { code: '4456', name: 'TVA déductible', category: 'Fiscal', class: 4 },
  { code: '4457', name: 'TVA collectée', category: 'Fiscal', class: 4 },
  { code: '447', name: 'Autres impôts, taxes et versements assimilés', category: 'Fiscal', class: 4 },
  { code: '45', name: 'Comptes de groupe et associés (Comptes courants)', category: 'Tiers', class: 4 },

  // CLASSE 5 : COMPTES FINANCIERS
  { code: '512', name: 'Banques (Comptes courants)', category: 'Trésorerie', class: 5 },
  { code: '515', name: 'Trésor Public / CCP', category: 'Trésorerie', class: 5 },
  { code: '53', name: 'Caisse', category: 'Trésorerie', class: 5 },
  { code: '58', name: 'Virements internes', category: 'Trésorerie', class: 5 },

  // CLASSE 6 : COMPTES DE CHARGES
  { code: '600', name: 'Achats de marchandises revendues', category: 'Charges', class: 6 },
  { code: '601', name: 'Matières premières consommées', category: 'Charges', class: 6 },
  { code: '607', name: 'Achats non stockés de matières et fournitures', category: 'Charges', class: 6 },
  { code: '61', name: 'Services extérieurs (Loyers, Entretien, Assurance...)', category: 'Charges', class: 6 },
  { code: '62', name: 'Autres services extérieurs (Transport, Missions, Honoraires...)', category: 'Charges', class: 6 },
  { code: '63', name: 'Charges de personnel (Salaires, Cotisations...)', category: 'Charges', class: 6 },
  { code: '64', name: 'Impôts, taxes et versements assimilés', category: 'Charges', class: 6 },
  { code: '66', name: 'Charges financières (Intérêts...)', category: 'Charges', class: 6 },
  { code: '68', name: 'Dotations aux amortissements et provisions', category: 'Charges', class: 6 },

  // CLASSE 7 : COMPTES DE PRODUITS
  { code: '700', name: 'Ventes de marchandises', category: 'Produits', class: 7 },
  { code: '701', name: 'Ventes de produits finis', category: 'Produits', class: 7 },
  { code: '704', name: 'Travaux édifiés', category: 'Produits', class: 7 },
  { code: '706', name: 'Prestations de services', category: 'Produits', class: 7 },
  { code: '74', name: 'Subventions d\'exploitation', category: 'Produits', class: 7 },
  { code: '75', name: 'Autres produits opérationnels', category: 'Produits', class: 7 },
  { code: '76', name: 'Produits financiers (Intérêts courus...)', category: 'Produits', class: 7 },
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
