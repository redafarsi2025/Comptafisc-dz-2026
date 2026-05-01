
/**
 * @fileoverview Modèle de données pour le journal d'audit.
 * @version 1.0.0
 */

/**
 * Représente une entrée dans le journal d'audit, capturant une action significative.
 * Collection: `audit_logs`
 */
export interface AuditLog {
  id: string; // UUID
  tenantId: string;

  /**
   * L'ID de l'utilisateur qui a effectué l'action.
   * Peut être 'system' pour les actions automatisées.
   */
  userId: string; 

  /**
   * Le type d'action effectuée.
   * Ex: 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN'.
   */
  action: string;

  /**
   * Le type de l'entité qui a été affectée.
   * Ex: 'purchase_order', 'budget_rule', 'workflow_instance'.
   */
  entityType: string;
  entityId: string;

  /**
   * Horodatage de l'action au format ISO 8601.
   */
  timestamp: string;

  /**
   * Un objet JSON contenant des détails contextuels sur l'action.
   * Peut inclure l'état avant et après, l'adresse IP, etc.
   */
  metadata?: any;
}
