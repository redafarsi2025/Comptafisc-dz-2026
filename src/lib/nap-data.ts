
export type NapActivity = {
  code: string;
  sector: 'COMMERCE' | 'SERVICES' | 'PRODUCTION' | 'BTP' | 'AGRICULTURE' | 'PROFESSIONS LIBÉRALES' | 'TRANSPORT' | 'HÔTELLERIE & RESTAURATION';
  label: string;
  tapRate: number;
};

export const NAP_ACTIVITIES: NapActivity[] = [
  // COMMERCE
  { code: '4711', sector: 'COMMERCE', label: 'Commerce de détail alimentaire général', tapRate: 0.02 },
  { code: '1071', sector: 'COMMERCE', label: 'Boulangerie / Pâtisserie', tapRate: 0.02 },
  { code: '4722', sector: 'COMMERCE', label: 'Boucherie / Charcuterie', tapRate: 0.02 },
  { code: '4761', sector: 'COMMERCE', label: 'Librairie / Papeterie', tapRate: 0.01 },
  { code: '4730', sector: 'COMMERCE', label: 'Carburant / Station-service', tapRate: 0.02 },
  
  // SERVICES
  { code: '6201', sector: 'SERVICES', label: 'Informatique / Développement', tapRate: 0.02 },
  { code: '7022', sector: 'SERVICES', label: 'Conseil en gestion', tapRate: 0.02 },
  { code: '6920', sector: 'SERVICES', label: 'Comptabilité / Expertise comptable', tapRate: 0.02 },
  { code: '8891', sector: 'SERVICES', label: 'Garderie / Crèche', tapRate: 0.01 },
  { code: '9311', sector: 'SERVICES', label: 'Fitness / Salle de sport', tapRate: 0.02 },
  
  // PRODUCTION
  { code: '1089', sector: 'PRODUCTION', label: 'Fabrication alimentaire générale', tapRate: 0.01 },
  { code: '1051', sector: 'PRODUCTION', label: 'Lait / Produits laitiers', tapRate: 0.01 },
  { code: '2100', sector: 'PRODUCTION', label: 'Pharmacie / Médicaments', tapRate: 0.01 },
  { code: '1811', sector: 'PRODUCTION', label: 'Imprimerie industrielle', tapRate: 0.02 },
  
  // BTP
  { code: '4110', sector: 'BTP', label: 'Construction immobilière résidentielle', tapRate: 0.03 },
  { code: '4120', sector: 'BTP', label: 'Construction bâtiments non résidentiels', tapRate: 0.03 },
  { code: '4210', sector: 'BTP', label: 'Travaux routes & génie civil', tapRate: 0.03 },
  
  // AGRICULTURE
  { code: '0111', sector: 'AGRICULTURE', label: 'Cultures céréalières', tapRate: 0.00 },
  { code: '0113', sector: 'AGRICULTURE', label: 'Maraîchage / Légumes', tapRate: 0.00 },
  { code: '0164', sector: 'AGRICULTURE', label: 'Agroalimentaire artisanal', tapRate: 0.01 },

  // PROFESSIONS LIBÉRALES
  { code: '8621', sector: 'PROFESSIONS LIBÉRALES', label: 'Médecin / Clinique privée', tapRate: 0.02 },
  { code: '6910', sector: 'PROFESSIONS LIBÉRALES', label: 'Avocat / Notaire', tapRate: 0.02 },
  
  // TRANSPORT
  { code: '4932', sector: 'TRANSPORT', label: 'Transport de voyageurs (taxi, bus)', tapRate: 0.02 },
  { code: '5320', sector: 'TRANSPORT', label: 'Livraison / Coursier', tapRate: 0.02 },

  // HÔTELLERIE
  { code: '5610', sector: 'HÔTELLERIE & RESTAURATION', label: 'Restaurant / Fast-food', tapRate: 0.02 },
];

export function findActivityByNap(code: string): NapActivity | undefined {
  return NAP_ACTIVITIES.find(a => a.code === code);
}
