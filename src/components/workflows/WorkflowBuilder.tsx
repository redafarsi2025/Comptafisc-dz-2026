
// src/components/workflows/WorkflowBuilder.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Workflow } from '@/models/workflow.models';
import { NewWorkflowForm } from './NewWorkflowForm'; // Nous allons créer ce composant
import { WorkflowsList } from './WorkflowsList'; // Et celui-ci aussi

/**
 * Le composant principal pour la construction et la gestion des workflows.
 */
export function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = 'tenant-123'; // TODO: Remplacer par une vraie gestion du tenant

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows', {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (e: any) {
      setError('Impossible de charger les workflows.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleWorkflowCreated = () => {
    // Re-fetch la liste pour afficher le nouveau workflow
    fetchWorkflows();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Nouveau Modèle de Workflow</h2>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <NewWorkflowForm onWorkflowCreated={handleWorkflowCreated} tenantId={tenantId} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Modèles Actuels</h2>
        <div className="border rounded-lg shadow-sm bg-card">
          {isLoading && <p className="p-4 text-center">Chargement...</p>}
          {error && <p className="p-4 text-center text-red-500">{error}</p>}
          {!isLoading && !error && <WorkflowsList workflows={workflows} />}
        </div>
      </div>
    </div>
  );
}
