export type NapActivity = {
  code: string;
  sector: string;
  label: string;
  tapRate: number;
};

/**
 * Nomenclature des Activités de Produits (NAP)
 * Note : Depuis le 1er Janvier 2024, la TAP est supprimée (0%) pour tous.
 */
export const NAP_ACTIVITIES: NapActivity[] = [
  // COMMERCE
  { code: '4711', sector: 'COMMERCE', label: 'Commerce de détail alimentaire général (Supérette)', tapRate: 0.00 },
  { code: '1071', sector: 'COMMERCE', label: 'Boulangerie / Pâtisserie traditionnelle', tapRate: 0.00 },
  { code: '4722', sector: 'COMMERCE', label: 'Boucherie / Charcuterie de détail', tapRate: 0.00 },
  { code: '4721', sector: 'COMMERCE', label: 'Commerce de détail de fruits et légumes', tapRate: 0.00 },
  { code: '4773', sector: 'COMMERCE', label: 'Pharmacie', tapRate: 0.00 },
  { code: '4761', sector: 'COMMERCE', label: 'Librairie / Papeterie / Fournitures de bureau', tapRate: 0.00 },
  { code: '4742', sector: 'COMMERCE', label: 'Téléphonie & Équipements de communication', tapRate: 0.00 },
  { code: '4771', sector: 'COMMERCE', label: 'Commerce de détail d\'habillement', tapRate: 0.00 },
  { code: '4772', sector: 'COMMERCE', label: 'Chaussures / Articles en cuir', tapRate: 0.00 },
  { code: '4754', sector: 'COMMERCE', label: 'Électroménager', tapRate: 0.00 },
  { code: '4752', sector: 'COMMERCE', label: 'Quincaillerie / Peintures et verres', tapRate: 0.00 },
  { code: '4730', sector: 'COMMERCE', label: 'Carburant / Station-service', tapRate: 0.00 },
  { code: '4777', sector: 'COMMERCE', label: 'Bijouterie / Horlogerie', tapRate: 0.00 },
  { code: '4764', sector: 'COMMERCE', label: 'Articles de sport', tapRate: 0.00 },
  { code: '4759', sector: 'COMMERCE', label: 'Meubles / Décoration', tapRate: 0.00 },
  { code: '4690', sector: 'COMMERCE', label: 'Grossiste (Commerce de gros)', tapRate: 0.00 },
  { code: '4791', sector: 'COMMERCE', label: 'Vente à distance / E-commerce', tapRate: 0.00 },
  
  // SERVICES
  { code: '9602', sector: 'SERVICES', label: 'Coiffure et soins de beauté', tapRate: 0.00 },
  { code: '9511', sector: 'SERVICES', label: 'Réparation de téléphones et ordinateurs', tapRate: 0.00 },
  { code: '9522', sector: 'SERVICES', label: 'Réparation d\'appareils électroménagers', tapRate: 0.00 },
  { code: '8553', sector: 'SERVICES', label: 'Enseignement de la conduite (Auto-école)', tapRate: 0.00 },
  { code: '5811', sector: 'SERVICES', label: 'Imprimerie / Reprographie', tapRate: 0.00 },
  { code: '7911', sector: 'SERVICES', label: 'Activités des voyagistes (Agence de voyage)', tapRate: 0.00 },
  { code: '7711', sector: 'SERVICES', label: 'Location de voitures et véhicules légers', tapRate: 0.00 },
  { code: '8891', sector: 'SERVICES', label: 'Activités de garde d\'enfants (Crèche)', tapRate: 0.00 },
  { code: '9311', sector: 'SERVICES', label: 'Gestion d\'installations sportives (Fitness)', tapRate: 0.00 },
  { code: '8121', sector: 'SERVICES', label: 'Nettoyage courant des bâtiments', tapRate: 0.00 },
  { code: '8010', sector: 'SERVICES', label: 'Activités de sécurité privée', tapRate: 0.00 },
  { code: '6201', sector: 'SERVICES', label: 'Programmation informatique / Développement', tapRate: 0.00 },
  { code: '7022', sector: 'SERVICES', label: 'Conseil pour les affaires et la gestion', tapRate: 0.00 },
  { code: '6920', sector: 'SERVICES', label: 'Comptabilité / Audit / Expertise comptable', tapRate: 0.00 },
  { code: '7112', sector: 'SERVICES', label: 'Architecture / Ingénierie / Études techniques', tapRate: 0.00 },
  { code: '7311', sector: 'SERVICES', label: 'Activités des agences de publicité', tapRate: 0.00 },
  { code: '7420', sector: 'SERVICES', label: 'Activités photographiques', tapRate: 0.00 },
  { code: '7430', sector: 'SERVICES', label: 'Traduction et interprétariat', tapRate: 0.00 },
  { code: '9603', sector: 'SERVICES', label: 'Services funéraires', tapRate: 0.00 },
  { code: '9601', sector: 'SERVICES', label: 'Blanchisserie / Pressing', tapRate: 0.00 },

  // PRODUCTION
  { code: '1812', sector: 'PRODUCTION', label: 'Imprimerie industrielle', tapRate: 0.00 },
  { code: '1089', sector: 'PRODUCTION', label: 'Fabrication d\'autres produits alimentaires', tapRate: 0.00 },
  { code: '1051', sector: 'PRODUCTION', label: 'Fabrication de produits laitiers', tapRate: 0.00 },
  { code: '1107', sector: 'PRODUCTION', label: 'Fabrication de boissons non alcoolisées', tapRate: 0.00 },
  { code: '1413', sector: 'PRODUCTION', label: 'Fabrication de vêtements de dessus', tapRate: 0.00 },
  { code: '1811', sector: 'PRODUCTION', label: 'Imprimerie de journaux', tapRate: 0.00 },
  { code: '3101', sector: 'PRODUCTION', label: 'Fabrication de meubles de bureau et de magasin', tapRate: 0.00 },
  { code: '2332', sector: 'PRODUCTION', label: 'Fabrication de briques, tuiles et produits en terre cuite', tapRate: 0.00 },
  { code: '2511', sector: 'PRODUCTION', label: 'Fabrication de structures métalliques', tapRate: 0.00 },
  { code: '2222', sector: 'PRODUCTION', label: 'Fabrication d\'emballages en matières plastiques', tapRate: 0.00 },
  { code: '2042', sector: 'PRODUCTION', label: 'Fabrication de parfums et de produits de toilette', tapRate: 0.00 },
  { code: '2790', sector: 'PRODUCTION', label: 'Fabrication d\'autres matériels électriques', tapRate: 0.00 },
  { code: '2100', sector: 'PRODUCTION', label: 'Industrie pharmaceutique (Médicaments)', tapRate: 0.00 },
  
  // BTP
  { code: '4110', sector: 'BTP', label: 'Promotion immobilière', tapRate: 0.00 },
  { code: '4120', sector: 'BTP', label: 'Construction de bâtiments résidentiels et non résidentiels', tapRate: 0.00 },
  { code: '4210', sector: 'BTP', label: 'Construction de routes et de voies ferrées', tapRate: 0.00 },
  { code: '4322', sector: 'BTP', label: 'Travaux de plomberie et d\'installation de chauffage', tapRate: 0.00 },
  { code: '4321', sector: 'BTP', label: 'Installation électrique', tapRate: 0.00 },
  { code: '4334', sector: 'BTP', label: 'Travaux de peinture et vitrerie', tapRate: 0.00 },
  { code: '4332', sector: 'BTP', label: 'Travaux de menuiserie', tapRate: 0.00 },
  { code: '4333', sector: 'BTP', label: 'Travaux de revêtement des sols et des murs', tapRate: 0.00 },
  { code: '4311', sector: 'BTP', label: 'Travaux de démolition et terrassement', tapRate: 0.00 },
  { code: '7732', sector: 'BTP', label: 'Location de machines et équipements pour la construction', tapRate: 0.00 },

  // AGRICULTURE
  { code: '0111', sector: 'AGRICULTURE', label: 'Culture de céréales, de légumineuses', tapRate: 0.00 },
  { code: '0113', sector: 'AGRICULTURE', label: 'Culture de légumes, de melons, de racines et de tubercules', tapRate: 0.00 },
  { code: '0124', sector: 'AGRICULTURE', label: 'Culture d\'autres fruits à pépins et à noyau', tapRate: 0.00 },
  { code: '0121', sector: 'AGRICULTURE', label: 'Culture de la vigne', tapRate: 0.00 },
  { code: '0141', sector: 'AGRICULTURE', label: 'Élevage de vaches laitières', tapRate: 0.00 },
  { code: '0147', sector: 'AGRICULTURE', label: 'Élevage de volailles', tapRate: 0.00 },
  { code: '0311', sector: 'AGRICULTURE', label: 'Pêche en mer', tapRate: 0.00 },
  { code: '0164', sector: 'AGRICULTURE', label: 'Traitement des semences pour la reproduction', tapRate: 0.00 },
];

export function findActivityByNap(code: string): NapActivity | undefined {
  return NAP_ACTIVITIES.find(a => a.code === code);
}
