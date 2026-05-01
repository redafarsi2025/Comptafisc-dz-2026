
/**
 * @fileoverview Modèles de données pour le moteur de règles budgétaires.
 * @version 1.0.0
 */

/**
 * Type d'événement qui peut déclencher une règle.
 * Ex: une demande d'achat, une soumission de facture, etc.
 */
export type BudgetEventType = 
  | 'purchase_request' 
  | 'commitment' 
  | 'supplier_invoice' 
  | 'asset_acquisition';

/**
 * Représente une règle budgétaire configurable.
 * Collection: `budget_rules`
 */
export interface BudgetRule {
  id: string; // UUID
  tenantId: string;

  name: string;
  description?: string;

  /**
   * Le type d'événement qui déclenche l'évaluation de cette règle.
   */
  eventType: BudgetEventType;

  /**
   * Les conditions à évaluer, stockées au format JSON.
   * Le moteur de règles interprétera ces conditions.
   * Exemple: { "amount": { ">": 1000000 }, "department": { "==": "IT" } }
   */
  conditions: any; // JSON object

  /**
   * Les actions à entreprendre si les conditions sont remplies.
   * Exemple: { "require_workflow": true, "workflow_id": "wf_abc123" }
   */
  actions: any; // JSON object

  /**
   * La priorité de la règle. Les règles avec une priorité plus élevée (valeur plus faible)
   * sont évaluées en premier.
   */
  priority: number;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
