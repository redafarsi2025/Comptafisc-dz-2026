
// src/models/workflow.models.ts

/**
 * @fileoverview Modèles de données pour le moteur de workflow.
 * @version 1.1.0
 */

import { BudgetEventType } from "./rules.models";

/**
 * Représente un modèle de processus de validation (workflow).
 * Collection: `workflows`
 */
export interface Workflow {
  id: string; // UUID
  tenantId: string;
  name: string;
  eventType: BudgetEventType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Représente une étape dans un processus de workflow.
 * Collection: `workflow_steps`
 */
export interface WorkflowStep {
  id: string; // UUID
  workflowId: string;
  stepOrder: number;
  roleRequired: string;
  minAmount?: number;
  maxAmount?: number;
  autoApprove: boolean;
}

/**
 * Interface étendue qui inclut le workflow et ses étapes.
 * Ce n'est pas un modèle de BDD, mais une structure de données pour l'API.
 */
export interface WorkflowWithSteps extends Workflow {
  steps: WorkflowStep[];
}


/**
 * Représente une exécution d'un workflow pour un objet métier spécifique.
 * Collection: `workflow_instances`
 */
export interface WorkflowInstance {
  id: string; // UUID
  tenantId: string;
  workflowId: string;
  referenceType: string;
  referenceId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number; // L'ordre de l'étape actuelle
  createdAt: string;
  updatedAt: string;
}

/**
 * Enregistre une action d'approbation (ou de rejet) pour une étape d'une instance.
 * Collection: `workflow_approvals`
 */
export interface WorkflowApproval {
  id: string; // UUID
  instanceId: string; // ID de l'instance de workflow
  stepId: string; // ID de l'étape de workflow concernée
  userId: string; // Qui a approuvé/rejeté
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  createdAt: string; // Quand la décision a été prise
  processedAt?: string; // Quand le système a traité la décision
}
