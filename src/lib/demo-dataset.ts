/**
 * @fileOverview RÉFÉRENTIEL DE DÉMONSTRATION 2.0 — SaaS Comptabilité & Fiscalité Algérie
 * Données fusionnées et corrigées pour une expérience immersive.
 */

export const WILAYAS_LIST = [
  { code: '16', nom: 'Alger' },
  { code: '31', nom: 'Oran' },
  { code: '25', nom: 'Constantine' },
  { code: '09', nom: 'Blida' },
  { code: '35', nom: 'Boumerdès' },
  { code: '06', nom: 'Béjaïa' },
  { code: '15', nom: 'Tizi Ouzou' },
  { code: '19', nom: 'Sétif' },
  { code: '23', nom: 'Annaba' },
  { code: '05', nom: 'Batna' },
];

export const PLAN_COMPTABLE = [
  { compte: '101',  libelle: 'Capital social', classe: 1 },
  { compte: '12',   libelle: 'Résultat de l\'exercice', classe: 1 },
  { compte: '213',  libelle: 'Constructions', classe: 2 },
  { compte: '2182', libelle: 'Matériel de transport', classe: 2 },
  { compte: '401',  libelle: 'Fournisseurs', classe: 4 },
  { compte: '411',  libelle: 'Clients', classe: 4 },
  { compte: '4456', libelle: 'TVA récupérable', classe: 4 },
  { compte: '4457', libelle: 'TVA collectée', classe: 4 },
  { compte: '512',  libelle: 'Banque', classe: 5 },
  { compte: '607',  libelle: 'Achats de marchandises', classe: 6 },
  { compte: '700',  libelle: 'Ventes de marchandises', classe: 7 },
];

export const DEMO_DATASET = {
  meta: {
    version: '2.0.0',
    genere: new Date().toISOString(),
    environment: 'demo',
  },
  
  enterprises: [
    {
      id: 'ENT001',
      raisonSociale: 'SARL Bensalem Commerce',
      formeJuridique: 'SARL',
      secteurActivite: 'COMMERCE',
      activiteNAP: '4711',
      wilaya: '16',
      ville: 'Alger',
      adresse: '12 Rue Didouche Mourad, Alger Centre',
      nif: '001216000123456',
      nis: '1621600012345',
      rc: '16/00-0123456B16',
      regimeFiscal: 'REGIME_REEL',
      assujettissementTva: true,
      debutActivite: '2018-03-15',
      gerant: 'Mohamed Bensalem',
      email: 'contact@bensalem-commerce.dz',
      onboardingComplete: true,
      plan: 'PRO'
    }
  ],

  salaries: [
    {
      id: 'SAL001',
      name: 'Zerrouki Kamel',
      position: 'Directeur Général',
      baseSalary: 180000,
      primesImposables: 0,
      indemnitePanier: 15000,
      indemniteTransport: 5000,
      nin: '091750422100112',
      cnasNumber: '0001609800123456',
      isGrandSud: false,
      isHandicapped: false
    },
    {
      id: 'SAL003',
      name: 'Bouzid Samira',
      position: 'Comptable principale',
      baseSalary: 65000,
      primesImposables: 5000,
      indemnitePanier: 2000,
      indemniteTransport: 1000,
      nin: '092850703050334',
      cnasNumber: '0001609800345678',
      isGrandSud: false,
      isHandicapped: false
    }
  ],

  factures: [
    { id: 'FAC2025001', date: '2025-01-08', clientName: 'SPA Grands Travaux Ouest', amountHT: 850000, tvaRate: 19, description: 'Fourniture matériaux de bureau' },
    { id: 'FAC2025002', date: '2025-01-15', clientName: 'SARL Bâtisseurs du Nord', amountHT: 320000, tvaRate: 19, description: 'Vente équipements bureautique' },
    { id: 'FAC2025004', date: '2025-02-18', clientName: 'EURL Pharmacie El Shifa', amountHT: 175000, tvaRate: 9, description: 'Mobilier médical' }
  ],

  ecrituresComptables: [
    {
      date: '2025-01-08',
      description: 'Vente FAC2025001 — SPA Grands Travaux Ouest',
      type: 'VENTES',
      ref: 'FAC2025001',
      lines: [
        { accountCode: '411', accountName: 'Clients', debit: 1011500, credit: 0 },
        { accountCode: '700', accountName: 'Ventes de marchandises', debit: 0, credit: 850000 },
        { accountCode: '4457', accountName: 'TVA collectée 19%', debit: 0, credit: 161500 },
      ]
    },
    {
      date: '2025-01-31',
      description: 'Encaissement FAC2025001 — virement BNA',
      type: 'BANQUE',
      ref: 'VIR-BNA-0131',
      lines: [
        { accountCode: '512', accountName: 'Banque BNA', debit: 1011500, credit: 0 },
        { accountCode: '411', accountName: 'Clients', debit: 0, credit: 1011500 },
      ]
    }
  ],

  declarationsG50: [
    { periode: '2025-01', tvaBrute: 161500, tvaDeductible: 42000, tvaNette: 119500, tap: 0, irgRetenu: 15600, totalMandatement: 135100, statut: 'Déposée' }
  ]
};