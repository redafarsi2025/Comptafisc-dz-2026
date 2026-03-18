
export type NapActivity = {
  code: string;
  sector: string;
  label: string;
  tapRate: number;
};

export const NAP_ACTIVITIES: NapActivity[] = [
  // COMMERCE
  { code: '4711', sector: 'COMMERCE', label: 'Commerce de détail alimentaire général (Supérette)', tapRate: 0.02 },
  { code: '1071', sector: 'COMMERCE', label: 'Boulangerie / Pâtisserie traditionnelle', tapRate: 0.02 },
  { code: '4722', sector: 'COMMERCE', label: 'Boucherie / Charcuterie de détail', tapRate: 0.02 },
  { code: '4761', sector: 'COMMERCE', label: 'Librairie / Papeterie / Fournitures de bureau', tapRate: 0.01 },
  { code: '4730', sector: 'COMMERCE', label: 'Carburant / Station-service / Lubrifiants', tapRate: 0.02 },
  { code: '4741', sector: 'COMMERCE', label: 'Matériel informatique et logiciels (Vente)', tapRate: 0.02 },
  { code: '4752', sector: 'COMMERCE', label: 'Quincaillerie et matériaux de construction', tapRate: 0.02 },
  
  // SERVICES
  { code: '6201', sector: 'SERVICES', label: 'Développement informatique / Logiciels / SaaS', tapRate: 0.02 },
  { code: '7022', sector: 'SERVICES', label: 'Conseil en gestion et stratégie d\'entreprise', tapRate: 0.02 },
  { code: '6920', sector: 'SERVICES', label: 'Comptabilité / Audit / Commissariat aux comptes', tapRate: 0.02 },
  { code: '8891', sector: 'SERVICES', label: 'Garderie / Crèche / Jardin d\'enfants', tapRate: 0.01 },
  { code: '9311', sector: 'SERVICES', label: 'Fitness / Salle de sport / Coaching', tapRate: 0.02 },
  { code: '7311', sector: 'SERVICES', label: 'Agence de publicité et communication', tapRate: 0.02 },
  
  // PRODUCTION
  { code: '1089', sector: 'PRODUCTION', label: 'Fabrication alimentaire générale industrielle', tapRate: 0.01 },
  { code: '1051', sector: 'PRODUCTION', label: 'Laiterie / Fromagerie industrielle', tapRate: 0.01 },
  { code: '2100', sector: 'PRODUCTION', label: 'Pharmacie / Fabrication de médicaments', tapRate: 0.01 },
  { code: '1811', sector: 'PRODUCTION', label: 'Imprimerie de presse / Edition', tapRate: 0.02 },
  { code: '2511', sector: 'PRODUCTION', label: 'Charpente métallique / Menuiserie aluminium', tapRate: 0.01 },
  
  // BTP
  { code: '4110', sector: 'BTP', label: 'Promotion immobilière résidentielle', tapRate: 0.03 },
  { code: '4120', sector: 'BTP', label: 'Construction de bâtiments industriels / Hangars', tapRate: 0.03 },
  { code: '4210', sector: 'BTP', label: 'Travaux publics / Routes / Ponts / Barrages', tapRate: 0.03 },
  { code: '4321', sector: 'BTP', label: 'Installation électrique / Domotique bâtiment', tapRate: 0.02 },
  
  // AGRICULTURE
  { code: '0111', sector: 'AGRICULTURE', label: 'Cultures céréalières et légumineuses', tapRate: 0.00 },
  { code: '0113', sector: 'AGRICULTURE', label: 'Maraîchage / Culture de légumes et melons', tapRate: 0.00 },
  { code: '0164', sector: 'AGRICULTURE', label: 'Transformation agroalimentaire à la ferme', tapRate: 0.01 },

  // PROFESSIONS LIBÉRALES
  { code: '8621', sector: 'PROFESSIONS LIBÉRALES', label: 'Médecine générale / Spécialisée / Clinique', tapRate: 0.02 },
  { code: '6910', sector: 'PROFESSIONS LIBÉRALES', label: 'Avocat / Notaire / Huissier de justice', tapRate: 0.02 },
  { code: '7111', sector: 'PROFESSIONS LIBÉRALES', label: 'Architecte / Bureau d\'études techniques', tapRate: 0.02 },
  
  // TRANSPORT
  { code: '4932', sector: 'TRANSPORT', label: 'Transport de voyageurs / Taxi / VTC', tapRate: 0.02 },
  { code: '5320', sector: 'TRANSPORT', label: 'Livraison de colis / Logistique dernier kilomètre', tapRate: 0.02 },
  { code: '4941', sector: 'TRANSPORT', label: 'Transport routier de marchandises (Poids lourds)', tapRate: 0.02 },

  // HÔTELLERIE
  { code: '5610', sector: 'HÔTELLERIE & RESTAURATION', label: 'Restaurant / Fast-food / Cafétéria', tapRate: 0.02 },
  { code: '5510', sector: 'HÔTELLERIE & RESTAURATION', label: 'Hôtel / Résidence touristique', tapRate: 0.02 },
];

export function findActivityByNap(code: string): NapActivity | undefined {
  return NAP_ACTIVITIES.find(a => a.code === code);
}
