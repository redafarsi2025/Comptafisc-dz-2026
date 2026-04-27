
/**
 * @fileOverview Référentiel des Modèles de Plan Comptable par Secteur.
 */

export interface AccountTemplateLine {
  number: string;
  label: string;
  type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
  class: number;
}

export const BASE_SCF_ACCOUNTS: AccountTemplateLine[] = [
  { number: '101', label: 'Capital social', type: 'PASSIF', class: 1 },
  { number: '106', label: 'Réserves', type: 'PASSIF', class: 1 },
  { number: '12', label: 'Résultat de l\'exercice', type: 'PASSIF', class: 1 },
  { number: '401', label: 'Fournisseurs de stocks et services', type: 'PASSIF', class: 4 },
  { number: '411', label: 'Clients', type: 'ACTIF', class: 4 },
  { number: '4456', label: 'TVA déductible', type: 'ACTIF', class: 4 },
  { number: '4457', label: 'TVA collectée', type: 'PASSIF', class: 4 },
  { number: '512', label: 'Banques', type: 'ACTIF', class: 5 },
  { number: '53', label: 'Caisse', type: 'ACTIF', class: 5 },
  { number: '600', label: 'Achats de marchandises vendues', type: 'CHARGE', class: 6 },
  { number: '631', label: 'Rémunérations du personnel', type: 'CHARGE', class: 6 },
  { number: '700', label: 'Ventes de marchandises', type: 'PRODUIT', class: 7 },
];

export const SECTOR_EXTENSIONS: Record<string, AccountTemplateLine[]> = {
  BTP: [
    { number: '231', label: 'Immobilisations corporelles en cours (Chantiers)', type: 'ACTIF', class: 2 },
    { number: '701', label: 'Travaux (Situations de travaux)', type: 'PRODUIT', class: 7 },
    { number: '4118', label: 'Clients retenue de garantie', type: 'ACTIF', class: 4 },
  ],
  TRANSPORT: [
    { number: '2182', label: 'Matériel de transport (Véhicules)', type: 'ACTIF', class: 2 },
    { number: '6061', label: 'Fournitures non stockables (Carburant)', type: 'CHARGE', class: 6 },
    { number: '706', label: 'Prestations de services (Transport)', type: 'PRODUIT', class: 7 },
  ],
  INDUSTRIE: [
    { number: '31', label: 'Matières premières et fournitures', type: 'ACTIF', class: 3 },
    { number: '35', label: 'Stocks de produits finis', type: 'ACTIF', class: 3 },
    { number: '701', label: 'Ventes de produits finis', type: 'PRODUIT', class: 7 },
  ],
  AGRICULTURE: [
    { number: '211', label: 'Terrains agricoles', type: 'ACTIF', class: 2 },
    { number: '31', label: 'Semences et engrais', type: 'ACTIF', class: 3 },
    { number: '701', label: 'Ventes de produits agricoles', type: 'PRODUIT', class: 7 },
  ],
  SERVICES: [
    { number: '706', label: 'Prestations de services (Conseil/Audit)', type: 'PRODUIT', class: 7 },
  ],
};

export function getCompletePlanForSector(sector: string): AccountTemplateLine[] {
  const extension = SECTOR_EXTENSIONS[sector] || [];
  return [...BASE_SCF_ACCOUNTS, ...extension];
}
