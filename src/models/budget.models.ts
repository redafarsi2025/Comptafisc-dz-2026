
/**
 * @fileoverview Modèles de données pour le module de gestion budgétaire du secteur public.
 * @version 2.0.0
 * @description Ce fichier définit les structures de données normalisées pour la gestion budgétaire
 *              en conformité avec les besoins de la comptabilité publique et les contraintes de Firestore.
 */

// -------------------
// STRUCTURE DU BUDGET
// -------------------

/**
 * Document principal du budget pour un exercice fiscal donné.
 * Collection: `budgets`
 */
export interface Budget {
  id: string; // UUID
  tenantId: string;
  fiscalYear: number;
  status: 'draft' | 'approved' | 'closed';
  totalAmount: number; // Somme de budget_lines.allocatedAmount
  createdAt: string;
  updatedAt: string;
}

/**
 * Section d'un budget (ex: 'Fonctionnement', 'Investissement').
 * Collection: `budget_sections`
 */
export interface BudgetSection {
  id: string; // UUID
  tenantId: string;
  budgetId: string;
  type: 'fonctionnement' | 'investissement'; // OPEX vs CAPEX
  label: string; // Ex: "Budget de Fonctionnement 2024"
  totalAllocated: number;
}

/**
 * Ligne budgétaire individuelle, liée à une section.
 * Collection: `budget_lines`
 */
export interface BudgetLine {
  id: string; // UUID
  tenantId: string;
  budgetId: string;
  sectionId: string;
  accountCode: string; // Compte comptable SCF
  label: string;
  allocatedAmount: number;
  committedAmount: number; // Engagé
  consumedAmount: number; // Liquidé/Consommé
}

// -------------------
// EXÉCUTION BUDGÉTAIRE
// -------------------

/**
 * Représente un engagement sur une ligne budgétaire (suite à un bon de commande).
 * Collection: `budget_commitments`
 */
export interface BudgetCommitment {
  id: string; // UUID
  tenantId: string;
  budgetLineId: string;
  referenceType: 'purchase_order' | 'asset_acquisition' | 'internal_request';
  referenceId: string; // ID du document source (ex: ID du bon de commande)
  amount: number;
  status: 'active' | 'released' | 'invoiced';
  createdAt: string;
}

/**
 * Représente une consommation (liquidation) sur une ligne budgétaire (suite à une facture).
 * Collection: `budget_consumptions`
 */
export interface BudgetConsumption {
  id: string; // UUID
  tenantId: string;
  budgetLineId: string;
  commitmentId?: string; // Lien vers l'engagement initial
  sourceEvent: 'supplier_invoice_received' | 'stock_exit' | 'asset_depreciation';
  sourceId: string; // ID de la facture fournisseur, etc.
  amount: number;
  date: string; // ISO 8601
}
