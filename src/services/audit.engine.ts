
/**
 * @fileoverview Moteur d'audit pour la journalisation des actions système.
 * @description Fournit une interface centralisée pour créer des entrées d'audit immuables.
 */

import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuditLog } from '@/models/audit.models';

/**
 * Enregistre une action significative dans le journal d'audit.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant où l'action a eu lieu.
 * @param userId - L'ID de l'utilisateur (ou 'system') qui a initié l'action.
 * @param action - Le type d'action (ex: 'WORKFLOW_START', 'STEP_APPROVE').
 * @param entityType - Le type de l'entité affectée (ex: 'workflow_instance').
 * @param entityId - L'ID de l'entité affectée.
 * @param metadata - Un objet contenant des données contextuelles (ex: { reason: 'Budget dépassé' }).
 */
export async function logAuditAction(
  db: Firestore,
  tenantId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: any = {}
): Promise<void> {

  try {
    const auditCollection = collection(db, 'audit_logs');

    const logEntry: Omit<AuditLog, 'id'> = {
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      metadata,
    };

    await addDoc(auditCollection, logEntry);

  } catch (error) {
    console.error("FATAL: Échec de l'écriture dans le journal d'audit!", error);
    // Dans un système de production, cela devrait déclencher une alerte critique.
    // Si l'audit échoue, cela peut indiquer un problème grave de base de données ou de permissions.
  }
}
