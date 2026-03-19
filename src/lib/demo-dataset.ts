/**
 * @fileOverview SEED COMPLET — SaaS Comptabilité & Fiscalité Algérie
 * @version 2.0
 * @description Jeu de données de démonstration fusionné, corrigé et enrichi.
 */

export type RegimeFiscal = 'REGIME_REEL' | 'IFU' | 'FORFAIT';
export type FormeJuridique = 'SARL' | 'SPA' | 'EURL' | 'SNC' | 'EI';
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
    abattementSalarie: { valeur: 0, note: 'Supprimé LF 2022' },
  },
  cnas: {
    patronale:  { valeur: 26, reference: 'Décret exéc. 96-209' },
    salariale:  { valeur: 9,  reference: 'Décret exéc. 96-209' },
  },
  tap: { valeur: 2, reference: 'Art. 217 CID', base: 'Chiffre d\'affaires HT' },
  smig: {
    mensuel: { valeur: 20000, unite: 'DZD', reference: 'Décret 23-188', effectifDepuis: '2023-06-01' },
    horaire: { valeur: 114.94, unite: 'DZD/h' },
  },
} as const;

export const PLAN_COMPTABLE = [
  { compte: '101',  libelle: 'Capital social ou individuel',     classe: 1, type: 'Passif'  },
  { compte: '106',  libelle: 'Réserves',                         classe: 1, type: 'Passif'  },
  { compte: '12',   libelle: 'Résultat de l\'exercice',          classe: 1, type: 'Passif'  },
  { compte: '164',  libelle: 'Emprunts auprès des étab. crédit', classe: 1, type: 'Passif'  },
  { compte: '211',  libelle: 'Terrains',                         classe: 2, type: 'Actif'   },
  { compte: '213',  libelle: 'Constructions',                    classe: 2, type: 'Actif'   },
  { compte: '215',  libelle: 'Installations techniques',         classe: 2, type: 'Actif'   },
  { compte: '218',  libelle: 'Autres immobilisations corp.',     classe: 2, type: 'Actif'   },
  { compte: '30',   libelle: 'Stocks de marchandises',           classe: 3, type: 'Actif'   },
  { compte: '401',  libelle: 'Fournisseurs et cptes rattachés',  classe: 4, type: 'Passif'  },
  { compte: '411',  libelle: 'Clients et comptes rattachés',     classe: 4, type: 'Actif'   },
  { compte: '4456', libelle: 'TVA récupérable sur ABS',          classe: 4, type: 'Actif'   },
  { compte: '4457', libelle: 'TVA collectée',                    classe: 4, type: 'Passif'  },
  { compte: '512',  libelle: 'Banques — comptes courants',       classe: 5, type: 'Actif'   },
  { compte: '607',  libelle: 'Achats de marchandises',           classe: 6, type: 'Charge'  },
  { compte: '700',  libelle: 'Ventes de marchandises',           classe: 7, type: 'Produit' },
] as const;

export const ORGANISATIONS = [
  {
    id:   'ORG001',
    type: 'cabinet' as OrganisationType,
    nom:  'Cabinet Expertise Comptable Boudiaf & Associés',
    plan: 'CABINET' as PlanAbonnement,
    nif:  '001631000321654',
    email: 'contact@cabinet-boudiaf.dz',
  },
] as const;

export const ENTREPRISES = [
  {
    id: 'ENT001',
    raisonSociale: 'SARL Bensalem Commerce',
    formeJuridique: 'SARL' as FormeJuridique,
    secteurActivite: 'Commerce de détail',
    wilaya: '16', ville: 'Alger',
    nif: '001216000123456',
    nis: '1621600012345',
    rc:  '16/00-0123456B16',
    regimeFiscal: 'REGIME_REEL' as RegimeFiscal,
    assujettiesTVA: true,
    debutActivite: '2018-03-15',
    email: 'contact@bensalem-commerce.dz',
    plan: 'PRO' as PlanAbonnement,
    onboardingComplete: true,
  },
  {
    id: 'ENT002',
    raisonSociale: 'SPA Constructions Maghreb',
    formeJuridique: 'SPA' as FormeJuridique,
    secteurActivite: 'BTP',
    wilaya: '09', ville: 'Blida',
    nif: '001609000987654',
    nis: '0921600098765',
    rc:  '09/00-0987654B09',
    regimeFiscal: 'REGIME_REEL' as RegimeFiscal,
    assujettiesTVA: true,
    dateCreation: '2010-07-01',
    email: 'dg@constructions-maghreb.dz',
    plan: 'PRO' as PlanAbonnement,
    onboardingComplete: true,
  },
] as const;

export const SALARIES = [
  {
    id: 'SAL001', entrepriseId: 'ENT002',
    nom: 'Zerrouki', prenom: 'Kamel',
    nin: '091750422100112',
    cnas: '0001609800123456',
    poste: 'Directeur Général',
    salaireBrut: 180_000,
    primesImposables: 0,
    indemnitePanier: 15000,
    indemniteTransport: 5000,
    isGrandSud: false,
    isHandicapped: false,
  },
] as const;

export const FACTURES = [
  {
    id: 'FAC-2025-001', entrepriseId: 'ENT001',
    numero: 'FAC2025001',
    date: '2025-01-08',
    client: { nom: 'SPA Grands Travaux Ouest', nif: '001316000111222' },
    amountHT: 850_000,
    tvaRate: 19,
    objet: 'Fourniture matériaux de bureau',
  },
] as const;

export const DECLARATIONS_G50 = [
  {
    id: 'G50-2025-01', entrepriseId: 'ENT001',
    periode: '2025-01', statut: 'Déposée' as StatutDeclaration,
    tvaBrute: 161_500, tvaDeductible: 42_000, tvaNette: 119_500,
    tap: 34_000, irgRetenu: 15_600, totalMandatement: 169_100,
  },
] as const;

export const ECRITURES_COMPTABLES = [
  {
    id: 'JNL-2025-0001', entrepriseId: 'ENT001',
    date: '2025-01-08', journal: 'VE' as JournalType,
    ref: 'FAC2025001',
    description: 'Vente FAC2025001 — SPA Grands Travaux Ouest',
    lines: [
      { accountCode: '411', accountName: 'Clients', debit: 1_011_500, credit: 0 },
      { accountCode: '700', accountName: 'Ventes de marchandises', debit: 0, credit: 850_000 },
      { accountCode: '4457', accountName: 'TVA collectée 19%', debit: 0, credit: 161_500 },
    ],
  },
] as const;

export const SEED = {
  meta: { version: '2.0.0', genere: new Date().toISOString() },
  wilayas: WILAYAS,
  tauxFiscaux2025: TAUX_FISCAUX_2025,
  planComptable: PLAN_COMPTABLE,
  organisations: ORGANISATIONS,
  entreprises: ENTREPRISES,
  salaries: SALARIES,
  factures: FACTURES,
  declarationsG50: DECLARATIONS_G50,
  ecrituresComptables: ECRITURES_COMPTABLES,
} as const;

export const DEMO_DATASET = SEED;
export default SEED;
