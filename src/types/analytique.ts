/**
 * @fileOverview Types TypeScript pour le module de Comptabilité Analytique.
 */

export type AxeCode = 'CC' | 'PRJ' | 'ACT' | 'REG' | 'DEP' | string;
export type EcritureOrigine = 'MANUEL' | 'PAIE' | 'STOCK' | 'FACTURE' | 'AUTO';
export type BudgetType = 'CHARGE' | 'PRODUIT';
export type Secteur = 'COMMERCE' | 'NEGOCE' | 'BTP' | 'LIBERAL' | 'INDUSTRIE' | 'HOTELLERIE' | 'AGRICULTURE' | 'SERVICES';

export interface AxeAnalytique {
  id: string;
  code: AxeCode;
  libelle: string;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
  secteurs: Secteur[];
}

export interface SectionAnalytique {
  id: string;
  axeId: string;
  axeCode: AxeCode;
  axeLibelle: string;
  code: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  actif: boolean;
}

export interface SectionTree extends SectionAnalytique {
  enfants: SectionTree[];
}

export interface Ventilation {
  sectionId: string;
  sectionCode: string;
  sectionLibelle: string;
  axeId: string;
  axeCode: AxeCode;
  pourcentage: number;   // somme par axe = 100
  montant: number;
}

export interface EcritureAnalytique {
  id: string;
  ecritureGLId: string;
  journalCode: string;
  dateEcriture: string; // ISO String
  compteCode: string;
  compteLibelle: string;
  classeCompte: string;
  debit: number;
  credit: number;
  montantNet: number;
  libelle: string;
  periode: string;
  exercice: string;
  origine: EcritureOrigine;
  origineRefId: string | null;
  ventilations: Ventilation[];
  ventilationComplete: boolean;
  createdAt: string;
  createdBy: string;
}

export interface RegleVentilation {
  id: string;
  libelle: string;
  compteDebut: string;
  compteFin: string;
  axeId: string;
  actif: boolean;
  priorite: number;
  cles: Array<{
    sectionId: string;
    sectionCode: string;
    sectionLibelle: string;
    pourcentage: number;
  }>;
}

export interface BudgetAnalytique {
  id: string;
  sectionId: string;
  sectionCode: string;
  axeId: string;
  exercice: string;
  periode: string | null;
  type: BudgetType;
  montant: number;
}

export interface ResultatSection {
  sectionId: string;
  sectionCode: string;
  sectionLibelle: string;
  charges: number;
  produits: number;
  marge: number;
  tauxMarge: number | null;
}

export interface ValidationVentilationResult {
  valid: boolean;
  erreurs: Array<{ axeCode: string; message: string }>;
}
