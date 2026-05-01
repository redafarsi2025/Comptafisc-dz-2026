
/**
 * @fileoverview Modèles de données pour le module des Achats (Procurement).
 * @version 1.0.0
 */

/**
 * Représente un item individuel sur un bon de commande.
 */
export interface PurchaseOrderItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Représente un bon de commande.
 * La création d'un document avec le statut 'approved' doit déclencher le processus d'engagement budgétaire.
 * Collection: `purchase_orders`
 */
export interface PurchaseOrder {
  id: string; // UUID
  tenantId: string;
  reference: string; // Numéro séquentiel, ex: BC-2024-00123
  supplierId: string; // ID du fournisseur depuis la collection 'contacts'
  budgetLineId: string; // ID de la ligne budgétaire à impacter
  
  items: PurchaseOrderItem[];
  totalAmount: number; // Somme de items.totalPrice
  
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'invoiced' | 'cancelled';
  
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  approvedAt?: string; // Date de validation de l'engagement
  notes?: string;
}
