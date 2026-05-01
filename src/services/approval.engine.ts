
/**
 * @fileoverview Moteur d'approbation pour la gestion des étapes de workflow.
 * @description Gère la logique d'approbation, de rejet et de progression des instances de workflow.
 */

import { Firestore, doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, runTransaction } from 'firebase/firestore';
import { WorkflowInstance, WorkflowStep } from '@/models/workflow.models';

// TODO: Remplacer par un véritable service d'audit
const logAuditEvent = (message: string) => console.log(`[AUDIT] ${message}`);

/**
 * Approuve une étape d'un workflow.
 * Si c'est la dernière étape, le statut du workflow passe à 'approved'.
 *
 * @param db - L'instance de Firestore.
 * @param instanceId - L'ID de l'instance de workflow à approuver.
 * @param userId - L'ID de l'utilisateur qui approuve.
 */
export async function approveStep(db: Firestore, instanceId: string, userId: string) {
  const instanceRef = doc(db, 'workflow_instances', instanceId);

  await runTransaction(db, async (transaction) => {
    const instanceDoc = await transaction.get(instanceRef);
    if (!instanceDoc.exists()) {
      throw new Error(`Instance de workflow non trouvée: ${instanceId}`);
    }

    const instance = instanceDoc.data() as WorkflowInstance;

    if (instance.status !== 'in_progress') {
      throw new Error(`Le workflow n'est pas en cours. Statut actuel: ${instance.status}`);
    }

    // 1. Vérifier si l'utilisateur a le bon rôle (LOGIQUE DE SÉCURITÉ CRUCIALE)
    // TODO: Implémenter la vérification des rôles. Pour l'instant, on fait confiance.
    // const userRole = await getUserRole(userId); // Exemple
    // const requiredRole = await getRequiredRoleForStep(instance.workflowId, instance.currentStep);
    // if (userRole !== requiredRole) throw new Error('Permission refusée');

    // 2. Trouver la prochaine étape dans la définition du workflow
    const stepsQuery = query(
        collection(db, 'workflow_steps'),
        where('workflowId', '==', instance.workflowId),
        where('stepOrder', '>', instance.currentStep),
        orderBy('stepOrder', 'asc')
    );
    const nextStepsSnapshot = await getDocs(stepsQuery);
    const nextStep = nextStepsSnapshot.empty ? null : nextStepsSnapshot.docs[0].data() as WorkflowStep;
    
    // 3. Mettre à jour l'instance
    if (nextStep) {
      // Il y a une étape suivante, on avance le workflow
      transaction.update(instanceRef, {
        currentStep: nextStep.stepOrder,
        updatedAt: new Date().toISOString(),
      });
      logAuditEvent(`Étape ${instance.currentStep} approuvée pour ${instance.referenceType} ${instance.referenceId} par ${userId}. Passage à l'étape ${nextStep.stepOrder}.`);
    } else {
      // C'est la dernière étape, le workflow est approuvé !
      transaction.update(instanceRef, {
        status: 'approved',
        currentStep: null, // Plus d'étape courante
        updatedAt: new Date().toISOString(),
      });

      // 4. DÉCLENCHER L'ACTION FINALE (Ex: valider le bon de commande)
      // TODO: Publier un événement ou appeler un service pour finaliser l'objet métier.
      // exemple: updatePurchaseOrderStatus(db, instance.referenceId, 'approved');
      logAuditEvent(`Workflow pour ${instance.referenceType} ${instance.referenceId} entièrement approuvé par ${userId}.`);
    }

    // 5. Enregistrer l'approbation (même si c'est la dernière étape)
    // TODO: Créer un enregistrement dans la collection `workflow_approvals`

  });
}

/**
 * Rejette un workflow en cours.
 * Cela met fin au processus de validation.
 *
 * @param db - L'instance de Firestore.
 * @param instanceId - L'ID de l'instance de workflow à rejeter.
 * @param userId - L'ID de l'utilisateur qui rejette.
 * @param reason - La raison du rejet.
 */
export async function rejectWorkflow(db: Firestore, instanceId: string, userId: string, reason: string) {
  const instanceRef = doc(db, 'workflow_instances', instanceId);
  const instanceDoc = await getDoc(instanceRef);

  if (!instanceDoc.exists()) {
    throw new Error(`Instance de workflow non trouvée: ${instanceId}`);
  }

  const instance = instanceDoc.data() as WorkflowInstance;
  if (instance.status !== 'in_progress') {
    throw new Error(`Le workflow n'est pas en cours. Statut actuel: ${instance.status}`);
  }

  // TODO: Vérifier les permissions de l'utilisateur pour le rejet.

  // Mettre à jour le statut à 'rejected'
  await updateDoc(instanceRef, {
    status: 'rejected',
    updatedAt: new Date().toISOString(),
  });

  // TODO: Créer un enregistrement dans `workflow_approvals` avec le statut 'rejected' et le commentaire.
  
  // TODO: Déclencher une action de rejet (ex: notifier le créateur, mettre à jour le PO)
  // updatePurchaseOrderStatus(db, instance.referenceId, 'rejected');
  logAuditEvent(`Workflow pour ${instance.referenceType} ${instance.referenceId} rejeté par ${userId}. Raison: ${reason}`);
}
