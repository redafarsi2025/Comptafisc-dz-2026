
/**
 * @fileOverview SEED COMPLET — SaaS Comptabilité & Fiscalité Algérie
 * @version 2.6 (Update 2026 NIF 20 Digits)
 * @description Jeu de données de démonstration mis à jour pour les nouvelles normes fiscales.
 */

export type RegimeFiscal = 'REGIME_REEL' | 'IFU' | 'FORFAIT';
export type FormeJuridique = 'SARL' | 'SPA' | 'EURL' | 'SNC' | 'EI' | 'ETABLISSEMENT_PUBLIC';
export type PlanAbonnement = 'ESSENTIEL' | 'PRO' | 'CABINET';
export type OrganisationType = 'cabinet' | 'entreprise';
export type UserRole = 'admin' | 'expert_comptable' | 'collaborateur' | 'daf' | 'readonly';
export type JournalType = 'VE' | 'AC' | 'BQ' | 'PA' | 'OD';
export type StatutDeclaration = 'Déposée' | 'En attente' | 'À venir' | 'En retard';

export const WILAYAS = [
  { code: '16', nom: 'Alger',       region: 'Centre' },
  { code: '31', nom: 'Oran',        region: 'Ouest'  },
  { code: '25', nom: 'Constantine', region: 'Est'    },
  { code: '09', nom: 'Blida',       region: 'Centre' },
  { code: '35', nom: 'Boumerdès',   region: 'Centre' },
  { code: '06', nom: 'Béjaïa',      region: 'Est'    },
  { code: '15', nom: 'Tizi Ouzou',  region: 'Centre' },
  { code: '19', nom: 'Sétif',       region: 'Est'    },
  { code: '23', nom: 'Annaba',      region: 'Est'    },
  { code: '05', nom: 'Batna',       region: 'Est'    },
] as const;

export const TAUX_FISCAUX_2025 = {
  tva: {
    normal:      { valeur: 19,  reference: 'Art. 21 CTCA',       effectifDepuis: '2017-01-01' },
    reduit:      { valeur: 9,   reference: 'Art. 23 CTCA',       effectifDepuis: '2017-01-01' },
    exonere:     { valeur: 0,   reference: 'Art. 9 CTCA',        effectifDepuis: null         },
  },
  ibs: {
    normal:      { valeur: 26,  reference: 'Art. 150 CID',       effectifDepuis: '2021-01-01' },
    services:    { valeur: 23,  reference: 'Art. 150 al.2 CID',  effectifDepuis: '2021-01-01' },
    production:  { valeur: 19,  reference: 'Art. 150 al.3 CID',  effectifDepuis: '2021-01-01' },
  },
  irg: {
    baremeProgressif: [
      { tranche: 1, min: 0,      max: 20000,  taux: 0,  reference: 'Art. 104 CID' },
      { tranche: 2, min: 20001,  max: 40000,  taux: 20, reference: 'Art. 104 CID' },
      { tranche: 3, min: 40001,  max: 80000,  taux: 30, reference: 'Art. 104 CID' },
      { tranche: 4, min: 80001,  max: 160000, taux: 33, reference: 'Art. 104 CID' },
      { tranche: 5, min: 160001, max: null,   taux: 35, reference: 'Art. 104 CID' },
    ],
  },
  cnas: {
    patronale:  { valeur: 26, reference: 'Décret exéc. 96-209' },
    salariale:  { valeur: 9,  reference: 'Décret exéc. 96-209' },
  },
} as const;

export const PLAN_COMPTABLE = [
  { compte: '30',   libelle: 'Stocks de marchandises',           classe: 3, type: 'Actif'   },
  { compte: '401',  libelle: 'Fournisseurs et comptes rattachés',  classe: 4, type: 'Passif'  },
  { compte: '411',  libelle: 'Clients et comptes rattachés',     classe: 4, type: 'Actif'   },
  { compte: '4456', libelle: 'TVA récupérable sur ABS',          classe: 4, type: 'Actif'   },
  { compte: '4457', libelle: 'TVA collectée',                    classe: 4, type: 'Passif'  },
  { compte: '700',  libelle: 'Ventes de marchandises',           classe: 7, type: 'Produit' },
] as const;

export const ENTREPRISES = [
  {
    id: 'ENT001',
    raisonSociale: 'SARL Bensalem Commerce',
    formeJuridique: 'SARL' as FormeJuridique,
    secteurActivite: 'COMMERCE',
    wilaya: '16',
    nif: '00011601012345678901', // Nouveau format 2026
    nis: '162160001234599',
    rc:  '16/00-0123456B16',
    regimeFiscal: 'REGIME_REEL' as RegimeFiscal,
    debutActivite: '2018-03-15',
    plan: 'PRO' as PlanAbonnement,
    onboardingComplete: true,
  },
  {
    id: 'ENT002',
    raisonSociale: 'SPA Constructions Maghreb',
    formeJuridique: 'SPA' as FormeJuridique,
    secteurActivite: 'BTP',
    wilaya: '09',
    nif: '00010901009876543210', // Nouveau format 2026
    nis: '092160009876588',
    rc:  '09/00-0987654B09',
    regimeFiscal: 'REGIME_REEL' as RegimeFiscal,
    onboardingComplete: true,
  },
] as const;

export const SALARIES = [
  {
    id: 'SAL001',
    name: 'Zerrouki Kamel',
    nin: '191750422100112345',
    cnasNumber: '0001609800123456',
    position: 'Directeur Général',
    baseSalary: 180000,
    primesImposables: 0,
    indemnitePanier: 15000,
    indemniteTransport: 5000,
  },
] as const;

export const FACTURES = [
  {
    id: 'FAC-2026-001',
    numero: 'FAC2026001',
    date: '2026-01-08',
    clientName: 'SPA Grands Travaux Ouest',
    amountHT: 850000,
    tvaRate: 19,
  },
] as const;

export const ECRITURES_COMPTABLES = [
  {
    id: 'JNL-2026-0001',
    date: '2026-01-08',
    journal: 'VENTES' as JournalType,
    ref: 'FAC2026001',
    description: 'Vente FAC2026001 — SPA Grands Travaux Ouest',
    lines: [
      { accountCode: '411', accountName: 'Clients', debit: 1011500, credit: 0 },
      { accountCode: '700', accountName: 'Ventes de marchandises', debit: 0, credit: 850000 },
      { accountCode: '4457', accountName: 'TVA collectée 19%', debit: 0, credit: 161500 },
    ],
  },
] as const;

export const SEED = {
  meta: { version: '2.6.0', standards: '2026-NIF-20-DIGITS', genere: new Date().toISOString() },
  wilayas: WILAYAS,
  tauxFiscaux2025: TAUX_FISCAUX_2025,
  planComptable: PLAN_COMPTABLE,
  entreprises: ENTREPRISES,
  salaries: SALARIES,
  factures: FACTURES,
  ecrituresComptables: ECRITURES_COMPTABLES,
} as const;

export const DEMO_DATASET = SEED;
export default SEED;
