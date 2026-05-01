
/**
 * @fileoverview Service de données pour la gestion des contacts.
 * @description Centralise les interactions avec Firestore pour la collection 'contacts'.
 */

import { Firestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Contact } from '@/models/contact.models';

/**
 * Récupère tous les contacts de type 'fournisseur' pour un tenant donné.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant (dossier).
 * @returns Un tableau de contacts fournisseurs.
 */
export async function getSuppliersByTenant(db: Firestore, tenantId: string): Promise<Contact[]> {
  if (!tenantId) return [];

  const suppliersQuery = query(
    collection(db, 'contacts'),
    where('tenantId', '==', tenantId),
    where('type', '==', 'supplier'),
    orderBy('name', 'asc')
  );

  try {
    const querySnapshot = await getDocs(suppliersQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
  } catch (error) {
    console.error("Erreur lors de la récupération des fournisseurs: ", error);
    return []; // Retourner un tableau vide en cas d'erreur
  }
}
