/**
 * @fileOverview SEED COMPLET V2.0 — SaaS Comptabilité & Fiscalité Algérie
 * Jeu de données de démonstration fusionné, corrigé et enrichi.
 */

export const DEMO_DATASET = {
  meta: {
    version: '2.0.0',
    genere: new Date().toISOString(),
    environment: 'demo',
  },
  
  // 1. TAUX FISCAUX LF 2025/2026
  tauxFiscaux: {
    tva: { normal: 19, reduit: 9, exonere: 0 },
    ibs: { normal: 26, services: 23, production: 19 },
    cnas: { patronale: 26, salariale: 9 },
    tap: 0, // Supprimée depuis 2024
    smig: 20000,
  },

  // 2. ENTREPRISES (Tenants)
  enterprises: [
    {
      id: 'ENT001',
      raisonSociale: 'SARL Bensalem Commerce',
      formeJuridique: 'SARL',
      secteurActivite: 'Commerce de détail',
      wilaya: '16', ville: 'Alger',
      adresse: '12 Rue Didouche Mourad, Alger Centre',
      nif: '001216000123456',
      nis: '1621600012345',
      rc: '16/00-0123456B16',
      banque: 'BNA',
      rib: '002 00001 0000123456789 10',
      capitalSocial: 1000000,
      regimeFiscal: 'REGIME_REEL',
      dateCreation: '2018-03-15',
      gerant: 'Mohamed Bensalem',
      email: 'contact@bensalem-commerce.dz',
      tel: '023 45 67 89',
      onboardingComplete: true,
    },
    {
      id: 'ENT002',
      raisonSociale: 'SPA Constructions Maghreb',
      formeJuridique: 'SPA',
      secteurActivite: 'BTP',
      wilaya: '09', ville: 'Blida',
      adresse: 'Zone Industrielle, Route de Boufarik, Blida',
      nif: '001609000987654',
      nis: '0921600098765',
      rc: '09/00-0987654B09',
      banque: 'CPA',
      rib: '007 00009 0000987654321 22',
      capitalSocial: 50000000,
      regimeFiscal: 'REGIME_REEL',
      dateCreation: '2010-07-01',
      gerant: 'Kamel Zerrouki',
      email: 'dg@constructions-maghreb.dz',
      tel: '025 32 11 44',
      onboardingComplete: true,
    },
    {
      id: 'ENT003',
      raisonSociale: 'EURL Informatique & Solutions',
      formeJuridique: 'EURL',
      secteurActivite: 'Services informatiques',
      wilaya: '16', ville: 'Alger',
      adresse: 'Bab Ezzouar, Cité USTO, Bt A, Alger',
      nif: '001216000456789',
      nis: '3216500045678',
      rc: '16/00-0456789B16',
      banque: 'BEA',
      rib: '003 00016 0000456789012 33',
      capitalSocial: 500000,
      regimeFiscal: 'IFU',
      dateCreation: '2020-01-20',
      gerant: 'Yasmine Hamdi',
      email: 'yasmine@infosolutions.dz',
      tel: '023 78 90 12',
      onboardingComplete: true,
    },
    {
      id: 'ENT004',
      raisonSociale: 'SARL Agroalim Sétif',
      formeJuridique: 'SARL',
      secteurActivite: 'Industrie agroalimentaire',
      wilaya: '19', ville: 'Sétif',
      adresse: "Zone d'Activités El Hidhab, Sétif",
      nif: '001919000654321',
      nis: '1919200065432',
      rc: '19/00-0654321B19',
      banque: 'BADR',
      rib: '020 00019 0000654321098 44',
      capitalSocial: 10000000,
      regimeFiscal: 'REGIME_REEL',
      dateCreation: '2015-09-12',
      gerant: 'Rachid Mebarki',
      email: 'direction@agroalim-setif.dz',
      tel: '036 89 45 12',
      onboardingComplete: true,
    },
    {
      id: 'ENT005',
      raisonSociale: 'SARL Transport El Watan',
      formeJuridique: 'SARL',
      secteurActivite: 'Transport & logistique',
      wilaya: '16', ville: 'Alger',
      adresse: 'Zone Logistique Rouiba, Alger',
      nif: '001916000999000',
      nis: '1916100099900',
      rc: '16/00-0999000B16',
      banque: 'BNP Paribas El Djazaïr',
      rib: '089 00016 0000999000111 77',
      capitalSocial: 5000000,
      regimeFiscal: 'REGIME_REEL',
      dateCreation: '2016-04-10',
      gerant: 'Amine Taleb',
      email: 'a.taleb@transport-elwatan.dz',
      tel: '023 55 66 77',
      onboardingComplete: true,
    },
  ],

  // 3. SALARIÉS (NIN structuré conforme WW·S·AA·MM·JJ·NNNN·CC)
  employees: [
    { id: 'SAL001', name: 'Zerrouki Kamel', position: 'Directeur Général', baseSalary: 180000, primesImposables: 0, primesNonImposables: 20000, nin: '091750422100112', cnasNumber: '0001609800123456', isGrandSud: false, isHandicapped: false },
    { id: 'SAL002', name: 'Mansouri Farid', position: 'Directeur Technique', baseSalary: 120000, primesImposables: 0, primesNonImposables: 10000, nin: '161780110200215', cnasNumber: '0001609800234567', isGrandSud: false, isHandicapped: false },
    { id: 'SAL003', name: 'Bouzid Samira', position: 'Comptable principale', baseSalary: 65000, primesImposables: 5000, primesNonImposables: 3000, nin: '092850703050334', cnasNumber: '0001609800345678', isGrandSud: false, isHandicapped: false },
    { id: 'SAL004', name: 'Rahmani Djamel', position: 'Chef de chantier', baseSalary: 75000, primesImposables: 10000, primesNonImposables: 5000, nin: '021800214070445', cnasNumber: '0001609800456789', isGrandSud: false, isHandicapped: false },
    { id: 'SAL005', name: 'Khelil Amina', position: 'Assistante RH', baseSalary: 35000, primesImposables: 0, primesNonImposables: 2000, nin: '312950920090556', cnasNumber: '0001609800567890', isGrandSud: false, isHandicapped: false },
    { id: 'SAL006', name: 'Boukhari Youcef', position: 'Ouvrier qualifié', baseSalary: 28000, primesImposables: 0, primesNonImposables: 3500, nin: '091900608110667', cnasNumber: '0001609800678901', isGrandSud: false, isHandicapped: false },
    { id: 'SAL007', name: 'Tahir Meriem', position: 'Ingénieure génie civil', baseSalary: 95000, primesImposables: 5000, primesNonImposables: 8000, nin: '252880317130778', cnasNumber: '0001609800789012', isGrandSud: false, isHandicapped: false },
    { id: 'SAL008', name: 'Aissaoui Sofiane', position: 'Conducteur d\'engins', baseSalary: 42000, primesImposables: 3000, primesNonImposables: 4000, nin: '191870225060889', cnasNumber: '0001609800890123', isGrandSud: false, isHandicapped: false },
  ],

  // 4. FACTURES ÉMISES
  invoices: [
    { id: 'FAC2025001', date: '2025-01-08', clientName: 'SPA Grands Travaux Ouest', amountHT: 850000, tvaRate: 19, description: 'Fourniture matériaux de bureau' },
    { id: 'FAC2025002', date: '2025-01-15', clientName: 'SARL Bâtisseurs du Nord', amountHT: 320000, tvaRate: 19, description: 'Vente équipements bureautique' },
    { id: 'FAC2025003', date: '2025-02-03', clientName: 'Administration Bir Mourad Raïs', amountHT: 1200000, tvaRate: 19, description: 'Fournitures administratives' },
    { id: 'FAC2025004', date: '2025-02-18', clientName: 'EURL Pharmacie El Shifa', amountHT: 175000, tvaRate: 9, description: 'Mobilier médical' },
    { id: 'FAC2025005', date: '2025-03-07', clientName: 'SPA Hôtel El Djazaïr', amountHT: 2300000, tvaRate: 19, description: 'Rénovation mobilier' },
    { id: 'FAC2025006', date: '2025-03-22', clientName: 'Université de Bab Ezzouar', amountHT: 480000, tvaRate: 0, description: 'Équipements pédagogiques exonérés' },
    { id: 'FAC2025007', date: '2025-04-10', clientName: 'SARL Transport El Watan', amountHT: 920000, tvaRate: 19, description: 'Pièces détachées véhicules' },
    { id: 'FAC2025008', date: '2025-04-28', clientName: 'SPA Lait & Produits Algérie', amountHT: 1850000, tvaRate: 9, description: 'Emballages alimentaires' },
    { id: 'FAC2025009', date: '2025-05-14', clientName: 'Direction des Impôts Wilaya 16', amountHT: 380000, tvaRate: 0, description: 'Fournitures de bureau (Marché Public)' },
    { id: 'FAC2025010', date: '2025-06-05', clientName: 'EURL TechnoServ', amountHT: 650000, tvaRate: 19, description: 'Matériel informatique' },
    { id: 'FAC2025011', date: '2025-06-19', clientName: 'Clinique Privée Ibn Sina', amountHT: 290000, tvaRate: 9, description: 'Équipements stérilisation' },
    { id: 'FAC2025012', date: '2025-07-03', clientName: 'SPA Cevital Agro', amountHT: 4200000, tvaRate: 9, description: 'Conditionnement Q3 2025' },
  ],

  // 5. ÉCRITURES COMPTABLES (PCN-DZ)
  journalEntries: [
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
      date: '2025-01-22',
      description: 'Achat stock — Papeterie Alger SARL',
      type: 'ACHATS',
      ref: 'ACH-2025-099',
      lines: [
        { accountCode: '607', accountName: 'Achats de marchandises', debit: 420000, credit: 0 },
        { accountCode: '4456', accountName: 'TVA récupérable', debit: 79800, credit: 0 },
        { accountCode: '401', accountName: 'Fournisseurs', debit: 0, credit: 499800 },
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
    },
    {
      date: '2025-02-28',
      description: 'Paie janvier 2025 — 8 salariés',
      type: 'PAIE',
      ref: 'PAIE-2025-01',
      lines: [
        { accountCode: '661', accountName: 'Rémunérations du personnel', debit: 210000, credit: 0 },
        { accountCode: '645', accountName: 'Charges sociales patronales (26%)', debit: 54600, credit: 0 },
        { accountCode: '421', accountName: 'Personnel — rémunérations dues', debit: 0, credit: 172920 },
        { accountCode: '431', accountName: 'CNAS salariale retenue (9%)', debit: 0, credit: 18900 },
        { accountCode: '447', accountName: 'IRG retenu sur salaires', debit: 0, credit: 15600 },
        { accountCode: '431', accountName: 'CNAS patronale à payer', debit: 0, credit: 54600 },
      ]
    }
  ],

  // 6. DÉCLARATIONS G50
  declarationsG50: [
    { periode: '2025-01', tvaBrute: 161500, tvaDeductible: 42000, tvaNette: 119500, tap: 34000, irgRetenu: 15600, totalMandatement: 169100, statut: 'Déposée', dateDepot: '2025-02-18' },
    { periode: '2025-02', tvaBrute: 248800, tvaDeductible: 68500, tvaNette: 180300, tap: 52100, irgRetenu: 15600, totalMandatement: 248000, statut: 'Déposée', dateDepot: '2025-03-19' },
    { periode: '2025-03', tvaBrute: 437000, tvaDeductible: 89200, tvaNette: 347800, tap: 98000, irgRetenu: 15600, totalMandatement: 461400, statut: 'Déposée', dateDepot: '2025-04-17' },
  ]
};
