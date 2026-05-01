
/**
 * @fileoverview Moteur de workflow pour la création et la gestion des processus de validation.
 */

import { Firestore, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { WorkflowInstance } from '@/models/workflow.models';

// Pour l'instant, l'ID de l'utilisateur qui initie est codé en dur.
// Dans une vraie application, il viendrait du contexte de l'utilisateur authentifié.
const SYSTEM_USER_ID = 'system';

/**
 * Démarre une nouvelle instance de workflow pour un objet métier donné.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant.
 * @param workflowId - L'ID du modèle de workflow à utiliser.
 * @param referenceType - Le type de l'entité métier (ex: 'purchase_order').
 * @param referenceId - L'ID de l'entité métier.
 * @param payload - L'objet de données original qui a déclenché le workflow, utilisé pour le contexte.
 * @returns La nouvelle instance de workflow créée.
 */
export async function startWorkflow(
  db: Firestore,
  tenantId: string,
  workflowId: string,
  referenceType: string,
  referenceId: string,
  payload: any
): Promise<WorkflowInstance> {

  // 1. Trouver la première étape du workflow à partir de la définition.
  const stepsQuery = query(
    collection(db, 'workflow_steps'),
    where('workflowId', '==', workflowId),
    orderBy('stepOrder', 'asc')
  );
  const stepsSnapshot = await getDocs(stepsQuery);

  if (stepsSnapshot.empty) {
    throw new Error(`Workflow Incomplet: Aucun pas défini pour le workflow ID: ${workflowId}`);
  }

  // TODO: Implémenter la logique de filtrage des étapes ici.
  // Par exemple, exclure les étapes dont le minAmount/maxAmount ne correspond pas au payload.amount.
  const allSteps = stepsSnapshot.docs.map(doc => doc.data());
  const firstStep = allSteps[0];

  // 2. Créer l'objet de l'instance de workflow.
  const newInstanceData = {
    tenantId,
    workflowId,
    referenceType,
    referenceId,
    status: 'in_progress' as const,
    currentStep: firstStep.stepOrder,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // TODO: Ajouter le payload ou un résumé dans l'instance pour le contexte ?
  };

  // 3. Sauvegarder la nouvelle instance dans Firestore.
  const instanceCollection = collection(db, 'workflow_instances');
  const docRef = await addDoc(instanceCollection, newInstanceData);

  console.log(`Workflow instance ${docRef.id} démarrée pour ${referenceType} ${referenceId}.`);

  // 4. TODO: Créer l'enregistrement initial dans workflow_approvals.
  // Cela pré-créerait la tâche pour les approbateurs du premier pas.

  // 5. TODO: Créer une entrée dans le journal d'audit (audit_logs).
  // logAction(db, tenantId, SYSTEM_USER_ID, 'WORKFLOW_START', 'workflow_instance', docRef.id, { referenceId });

  const newInstance: WorkflowInstance = {
    id: docRef.id,
    ...newInstanceData,
  };

  return newInstance;
}
