
// src/components/approvals/TaskDetails.tsx
'use client';

import React, { useState } from 'react';
import { WorkflowInstance } from '@/models/workflow.models';

interface TaskDetailsProps {
  task: WorkflowInstance;
  onTaskUpdate: () => void;
  currentUser: string;
}

export function TaskDetails({ task, onTaskUpdate, currentUser }: TaskDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (decision: 'APPROVED' | 'REJECTED') => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/workflows/${task.id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-123',
          'x-user-id': currentUser, 
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Échec de l'action: ${decision}`);
      }
      
      onTaskUpdate(); // Notifier le parent de la mise à jour

    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg shadow-sm bg-card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Détails de la demande</h3>
        <p className="text-sm text-muted-foreground">ID de l'instance: {task.id}</p>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between"><span className="font-medium">Nom:</span> <span>{task.context.name}</span></div>
        <div className="flex justify-between"><span className="font-medium">Montant:</span> <span className="font-bold">{task.context.amount} €</span></div>
        <div className="flex justify-between"><span className="font-medium">Service:</span> <span>{task.context.department}</span></div>
        <div className="flex justify-between"><span className="font-medium">Créé le:</span> <span>{new Date(task.createdAt).toLocaleString('fr-FR')}</span></div>
      </div>

      <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Étape actuelle</h4>
          <p>En attente de l'approbation du rôle : <span className="font-mono bg-muted px-2 py-1 rounded">{task.currentStep.roleRequired}</span></p>
      </div>

      {actionError && <div className="p-3 bg-red-100 text-red-800 rounded-md">{actionError}</div>}

      <div className="border-t pt-4 flex justify-end space-x-3">
        <button 
            onClick={() => handleAction('REJECTED')}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
            Rejeter
        </button>
        <button 
            onClick={() => handleAction('APPROVED')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
            {isSubmitting ? 'Traitement...' : 'Approuver'}
        </button>
      </div>
    </div>
  );
}
