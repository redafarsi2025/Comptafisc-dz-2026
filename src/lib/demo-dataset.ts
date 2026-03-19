/**
 * @fileOverview Jeu de données de démonstration complet pour le SaaS ComptaFisc-DZ.
 * Contient les entreprises, salariés, factures et écritures comptables types.
 */

export const DEMO_DATASET = {
  enterprises: [
    {
      id: "DEMO_ENT_001",
      raisonSociale: "SARL Bensalem Commerce",
      formeJuridique: "SARL",
      secteurActivite: "COMMERCE",
      activiteNAP: "4711",
      wilaya: "16",
      ville: "Alger",
      adresse: "12 Rue Didouche Mourad, Alger Centre",
      nif: "001216000123456",
      nis: "1621600012345",
      rc: "16/00-0123456B16",
      capitalSocial: 1000000,
      regimeFiscal: "REGIME_REEL",
      debutActivite: "2018-03-15",
      gerant: "Mohamed Bensalem",
      email: "contact@bensalem-commerce.dz",
      tel: "023 45 67 89",
      onboardingComplete: true,
      plan: "PRO"
    },
    {
      id: "DEMO_ENT_002",
      raisonSociale: "SPA Constructions Maghreb",
      formeJuridique: "SPA",
      secteurActivite: "BTP",
      activiteNAP: "4120",
      wilaya: "09",
      ville: "Blida",
      adresse: "Zone Industrielle, Route de Boufarik, Blida",
      nif: "001609000987654",
      nis: "0921600098765",
      rc: "09/00-0987654B09",
      capitalSocial: 50000000,
      regimeFiscal: "REGIME_REEL",
      debutActivite: "2010-07-01",
      gerant: "Kamel Zerrouki",
      email: "dg@constructions-maghreb.dz",
      onboardingComplete: true,
      plan: "CABINET"
    }
  ],
  employees: [
    { name: "Zerrouki Kamel", position: "Directeur Général", baseSalary: 180000, primesImposables: 0, cnasNumber: "0001216800123456", nin: "123456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Mansouri Farid", position: "Directeur Technique", baseSalary: 120000, primesImposables: 0, cnasNumber: "0001216800234567", nin: "223456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Bouzid Samira", position: "Comptable principale", baseSalary: 65000, primesImposables: 5000, cnasNumber: "0001216800345678", nin: "323456789012345678", isGrandSud: false, isHandicapped: false },
    { name: "Rahmani Djamel", position: "Chef de chantier", baseSalary: 75000, primesImposables: 10000, cnasNumber: "0001216800456789", nin: "423456789012345678", isGrandSud: false, isHandicapped: false },
  ],
  invoices: [
    { invoiceNumber: "FAC-2025-001", clientName: "SPA Grands Travaux Ouest", amountHT: 850000, tvaRate: 19, description: "Fourniture matériaux de bureau", date: "2025-01-08" },
    { invoiceNumber: "FAC-2025-002", clientName: "SARL Bâtisseurs du Nord", amountHT: 320000, tvaRate: 19, description: "Vente équipements bureautique", date: "2025-01-15" },
    { invoiceNumber: "FAC-2025-003", clientName: "Admin Bir Mourad Raïs", amountHT: 1200000, tvaRate: 19, description: "Fournitures administratives", date: "2025-02-03" },
  ],
  journalEntries: [
    {
      date: "2025-01-08",
      description: "Vente FAC-2025-001 - SPA Grands Travaux Ouest",
      type: "VENTES",
      ref: "FAC-2025-001",
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
