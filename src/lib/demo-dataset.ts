/**
 * @fileOverview Jeu de données de démonstration complet — SaaS Comptabilité & Fiscalité Algérie
 * Toutes les données sont fictives mais réalistes (NIF, NIS, RC, RIB conformes).
 */

export const DEMO_DATASET = {
  wilayas: [
    { code: "16", nom: "Alger" }, { code: "31", nom: "Oran" },
    { code: "25", nom: "Constantine" }, { code: "09", nom: "Blida" },
    { code: "35", nom: "Boumerdès" }, { code: "06", nom: "Béjaïa" },
    { code: "15", nom: "Tizi Ouzou" }, { code: "19", nom: "Sétif" },
    { code: "23", nom: "Annaba" }, { code: "05", nom: "Batna" },
  ],
  enterprises: [
    {
      id: "ENT001",
      raisonSociale: "SARL Bensalem Commerce",
      formeJuridique: "SARL",
      secteurActivite: "Commerce de détail",
      wilaya: "16", ville: "Alger",
      adresse: "12 Rue Didouche Mourad, Alger Centre",
      nif: "001216000123456",
      nis: "1621600012345",
      rc: "16/00-0123456B16",
      rib: "002 00001 0000123456789 10",
      capitalSocial: 1000000,
      regimeFiscal: "REGIME_REEL",
      debutActivite: "2018-03-15",
      gerant: "Mohamed Bensalem",
      email: "contact@bensalem-commerce.dz",
      tel: "023 45 67 89",
      plan: "PRO",
      onboardingComplete: true
    },
    {
      id: "ENT002",
      raisonSociale: "SPA Constructions Maghreb",
      formeJuridique: "SPA",
      secteurActivite: "BTP",
      wilaya: "09", ville: "Blida",
      adresse: "Zone Industrielle, Route de Boufarik, Blida",
      nif: "001609000987654",
      nis: "0921600098765",
      rc: "09/00-0987654B09",
      rib: "007 00009 0000987654321 22",
      capitalSocial: 50000000,
      regimeFiscal: "REGIME_REEL",
      debutActivite: "2010-07-01",
      gerant: "Kamel Zerrouki",
      email: "dg@constructions-maghreb.dz",
      tel: "025 32 11 44",
      plan: "CABINET",
      onboardingComplete: true
    },
    {
      id: "ENT003",
      raisonSociale: "EURL Informatique & Solutions",
      formeJuridique: "EURL",
      secteurActivite: "SERVICES",
      wilaya: "16", ville: "Alger",
      adresse: "Bab Ezzouar, Cité USTO, Alger",
      nif: "001216000456789",
      nis: "3216500045678",
      rc: "16/00-0456789B16",
      capitalSocial: 500000,
      regimeFiscal: "IFU",
      debutActivite: "2020-01-20",
      gerant: "Yasmine Hamdi",
      email: "yasmine@infosolutions.dz",
      plan: "ESSENTIEL",
      onboardingComplete: true
    }
  ],
  employees: [
    { name: "Zerrouki Kamel", position: "Directeur Général", baseSalary: 180000, primesImposables: 0, cnasNumber: "0001216800123456", nin: "123456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Mansouri Farid", position: "Directeur Technique", baseSalary: 120000, primesImposables: 0, cnasNumber: "0001216800234567", nin: "223456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Bouzid Samira", position: "Comptable principale", baseSalary: 65000, primesImposables: 5000, cnasNumber: "0001216800345678", nin: "323456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Rahmani Djamel", position: "Chef de chantier", baseSalary: 75000, primesImposables: 10000, cnasNumber: "0001216800456789", nin: "423456789012345678", isGrandSud: false, isHandicapped: false },
  ],
  invoices: [
    { invoiceNumber: "FAC2025001", clientName: "SPA Grands Travaux Ouest", amountHT: 850000, tvaRate: 19, description: "Fourniture matériaux de bureau", date: "2025-01-08" },
    { invoiceNumber: "FAC2025002", clientName: "SARL Bâtisseurs du Nord", amountHT: 320000, tvaRate: 19, description: "Vente équipements bureautique", date: "2025-01-15" },
    { invoiceNumber: "FAC2025003", clientName: "Admin Bir Mourad Raïs", amountHT: 1200000, tvaRate: 19, description: "Fournitures administratives", date: "2025-02-03" },
    { invoiceNumber: "FAC2025004", clientName: "EURL Pharmacie El Shifa", amountHT: 175000, tvaRate: 9, description: "Mobilier médical", date: "2025-02-18" },
  ],
  journalEntries: [
    {
      date: "2025-01-08",
      description: "Vente FAC2025001 - SPA Grands Travaux Ouest",
      type: "VENTES",
      ref: "FAC2025001",
      lines: [
        { accountCode: "411", accountName: "Clients", debit: 1011500, credit: 0 },
        { accountCode: "700", accountName: "Ventes de marchandises", debit: 0, credit: 850000 },
        { accountCode: "4457", accountName: "TVA collectée", debit: 0, credit: 161500 },
      ]
    },
    {
      date: "2025-01-22",
      description: "Achat Fournisseur Papeterie Alger",
      type: "ACHATS",
      ref: "ACH-2025-099",
      lines: [
        { accountCode: "607", accountName: "Achats non stockés", debit: 420000, credit: 0 },
        { accountCode: "4456", accountName: "TVA déductible", debit: 79800, credit: 0 },
        { accountCode: "401", accountName: "Fournisseurs", debit: 0, credit: 499800 },
      ]
    }
  ]
};
