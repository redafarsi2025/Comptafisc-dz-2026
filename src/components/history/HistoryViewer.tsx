
// src/components/history/HistoryViewer.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowInstance } from '@/models/workflow.models';
import { InstanceList } from './InstanceList';
import { InstanceDetails } from './InstanceDetails';

/**
 * Le composant principal pour la visualisation de l'historique des workflows.
 */
export function HistoryViewer() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = 'tenant-123';

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows/history', {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error("Erreur lors du chargement de l'historique.");
      const data = await response.json();
      setInstances(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border rounded-lg shadow-sm bg-card h-fit">
            <InstanceList 
                instances={instances}
                isLoading={isLoading}
                error={error}
                selectedInstanceId={selectedInstance?.id || null}
                onInstanceSelect={setSelectedInstance}
            />
        </div>
        <div className="lg:col-span-2">
            {selectedInstance ? (
                <InstanceDetails instance={selectedInstance} />
            ) : (
                <div className="flex items-center justify-center h-full p-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Sélectionnez une instance pour voir son historique.</p>
                </div>
            )}
        </div>
    </div>
  );
}
