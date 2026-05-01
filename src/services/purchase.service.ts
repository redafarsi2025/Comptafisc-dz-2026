
/**
 * @fileoverview Service de données pour la gestion des achats.
 * @description Centralise les interactions avec Firestore pour les collections liées aux achats.
 */

import { Firestore, collection, query, where, getDocs, orderBy, documentId } from 'firebase/firestore';
import { PurchaseOrder } from '@/models/purchase.models';
import { Contact } from '@/models/contact.models';

/**
 * Représente un bon de commande enrichi avec le nom du fournisseur.
 */
export type EnrichedPurchaseOrder = PurchaseOrder & {
  supplierName: string;
};

/**
 * Récupère tous les bons de commande pour un tenant donné, et les enrichit
 * avec les informations du fournisseur.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant (dossier).
 * @returns Un tableau de bons de commande enrichis.
 */
export async function getPurchaseOrdersByTenant(db: Firestore, tenantId: string): Promise<EnrichedPurchaseOrder[]> {
  if (!tenantId) return [];

  // 1. Récupérer tous les bons de commande pour le tenant
  const poQuery = query(
    collection(db, 'purchase_orders'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  
  const poSnapshot = await getDocs(poQuery);
  const purchaseOrders = poSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));

  if (purchaseOrders.length === 0) {
    return [];
  }

  // 2. Extraire les IDs uniques des fournisseurs pour éviter les requêtes multiples
  const supplierIds = [...new Set(purchaseOrders.map(po => po.supplierId).filter(id => id))];

  if (supplierIds.length === 0) {
    return purchaseOrders.map(po => ({ ...po, supplierName: 'N/A' }));
  }

  // 3. Récupérer les informations des fournisseurs en une seule requête
  const suppliersQuery = query(collection(db, 'contacts'), where(documentId(), 'in', supplierIds));
  const suppliersSnapshot = await getDocs(suppliersQuery);
  const suppliersMap = new Map<string, string>();
  suppliersSnapshot.forEach(doc => {
    const contact = doc.data() as Contact;
    suppliersMap.set(doc.id, contact.name);
  });

  // 4. Enrichir les bons de commande avec le nom du fournisseur
  const enrichedPurchaseOrders: EnrichedPurchaseOrder[] = purchaseOrders.map(po => ({
    ...po,
    supplierName: suppliersMap.get(po.supplierId) || 'Fournisseur inconnu',
  }));

  return enrichedPurchaseOrders;
}
