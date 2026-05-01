
// src/components/history/InstanceList.tsx
'use client';

import React from 'react';
import { WorkflowInstance } from '@/models/workflow.models';

interface InstanceListProps {
  instances: WorkflowInstance[];
  isLoading: boolean;
  error: string | null;
  selectedInstanceId: string | null;
  onInstanceSelect: (instance: WorkflowInstance) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function InstanceList({ instances, isLoading, error, selectedInstanceId, onInstanceSelect }: InstanceListProps) {

    if (isLoading) {
        return <div className="p-4 text-center">Chargement...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    if (instances.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Aucun historique trouvé.</div>;
    }

    return (
        <ul className="divide-y divide-border">
            {instances.map(instance => (
                <li key={instance.id}>
                    <button 
                        onClick={() => onInstanceSelect(instance)}
                        className={`w-full text-left p-4 hover:bg-muted/50 ${selectedInstanceId === instance.id ? 'bg-muted/80' : ''}`}
                    >
                        <div className="flex justify-between items-center">
                            <p className="font-semibold">{instance.context.name}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(instance.status)}`}>
                                {instance.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">Montant: {instance.context.amount} €</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {instance.id}</p>
                    </button>
                </li>
            ))}
        </ul>
    );
}
