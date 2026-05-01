
// src/app/dashboard/workflows/page.tsx
'use client';
import React, { useState } from 'react';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { Button } from '@/components/ui/button';
import { Workflow, WorkflowStep } from '@/models/workflow.models';

/**
 * Page principale pour la gestion des modèles de workflow.
 */
export default function WorkflowsPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const tenantId = 'tenant-123'; // This should be dynamically determined in a real app

  const handleInitWorkflow = async () => {
    setIsInitializing(true);
    try {
      const initialSteps: Omit<WorkflowStep, 'id' | 'workflowId'>[] = [
        {
          stepOrder: 1,
          roleRequired: 'service_manager',
          autoApprove: false
        },
        {
          stepOrder: 2,
          roleRequired: 'director',
          minAmount: 200000,
          autoApprove: false
        },
        {
          stepOrder: 3,
          roleRequired: 'finance_manager',
          minAmount: 500000,
          autoApprove: false
        },
        {
          stepOrder: 4,
          roleRequired: 'system',
          autoApprove: true
        }
      ];

      const initialWorkflowData = {
        name: 'Validation dépenses entreprises publiques DZ',
        eventType: 'purchase_request',
        isActive: true,
        steps: initialSteps,
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(initialWorkflowData),
      });

      if (!response.ok) {
        // Correction: Lire la propriété `error` au lieu de `message`.
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la création du workflow initial.');
      }

      console.log('Workflow initial créé avec succès!');
      window.location.reload();

    } catch (error: any) {
      console.error(error);
      alert(`Erreur: ${error.message}`); // Maintenant, ceci affichera le vrai message d'erreur.
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Concepteur de Workflow</h1>
          <p className="text-muted-foreground mt-1">
            Créez et gérez les processus d\'approbation pour vos activités métier.
          </p>
        </div>
        <Button onClick={handleInitWorkflow} disabled={isInitializing}>
          {isInitializing ? 'Initialisation...' : 'Initialiser le Workflow'}
        </Button>
      </header>
      
      <main>
        <WorkflowBuilder />
      </main>
    </div>
  );
}
