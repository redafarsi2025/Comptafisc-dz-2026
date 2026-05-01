
// src/components/history/InstanceDetails.tsx
'use client';

import React from 'react';
import { WorkflowInstance, AuditLog } from '@/models/workflow.models';

interface InstanceDetailsProps {
  instance: WorkflowInstance;
}

const getDecisionBadge = (decision: string) => {
  switch (decision) {
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function InstanceDetails({ instance }: InstanceDetailsProps) {
  return (
    <div className="border rounded-lg shadow-sm bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Détails de l'Instance</h3>
        <p className="text-sm text-muted-foreground">ID: {instance.id}</p>
      </div>

      {/* Informations sur le Contexte */}
      <div className="border-t pt-4 space-y-2">
        <h4 className="font-semibold mb-2">Contexte de la Demande</h4>
        <div className="flex justify-between"><span className="font-medium">Nom:</span> <span>{instance.context.name}</span></div>
        <div className="flex justify-between"><span className="font-medium">Montant:</span> <span className="font-bold">{instance.context.amount} €</span></div>
        <div className="flex justify-between"><span className="font-medium">Service:</span> <span>{instance.context.department}</span></div>
      </div>

      {/* Journal d'Audit */}
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-4">Journal d'Audit</h4>
        <div className="space-y-4">
            {instance.auditLog.map((log, index) => (
                <div key={index} className="flex space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">{index + 1}</div>
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm">
                            Action par <span className="font-medium">{log.userId}</span> à l'étape <span className="font-medium">{log.stepOrder}</span>
                        </p>
                        <div className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </div>
                        <div className="mt-1">
                           <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDecisionBadge(log.decision)}`}>{log.decision}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
