
// src/components/workflows/WorkflowsList.tsx
'use client';

import React, { useState } from 'react';
import { WorkflowWithSteps, WorkflowStep } from '@/models/workflow.models';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface WorkflowsListProps {
  workflows: WorkflowWithSteps[];
}

// Un composant pour afficher les détails d'une étape
const StepDetail = ({ step }: { step: WorkflowStep }) => {
  const conditions = [];
  if (step.minAmount !== undefined) conditions.push(`Montant >= ${step.minAmount}`);
  if (step.maxAmount !== undefined) conditions.push(`Montant <= ${step.maxAmount}`);

  return (
    <div className="pl-4 py-2 text-sm text-muted-foreground">
        <p><span className="font-semibold">Rôle requis:</span> {step.roleRequired}</p>
        {conditions.length > 0 && <p><span className="font-semibold">Conditions:</span> {conditions.join(', ')}</p>}
        {step.autoApprove && <p className="text-blue-600 font-medium">Approbation automatique</p>}
    </div>
  );
};

export function WorkflowsList({ workflows }: WorkflowsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (workflows.length === 0) {
    return <p className="p-4 text-center text-muted-foreground">Aucun modèle de workflow défini.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm divide-y divide-border">
        <thead className="bg-muted/40">
          <tr>
            <th className="w-8"></th>
            <th className="px-4 py-2 text-left font-semibold">Nom</th>
            <th className="px-4 py-2 text-left font-semibold">Déclenché par</th>
            <th className="px-4 py-2 text-left font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workflows.map((wf) => (
            <React.Fragment key={wf.id}>
              <tr className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)}>
                <td className="px-4 py-3">
                  {expandedId === wf.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </td>
                <td className="px-4 py-3 font-medium">{wf.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{wf.eventType}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${wf.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {wf.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
              {expandedId === wf.id && (
                <tr>
                  <td colSpan={4} className="p-4 bg-muted/20">
                    <h4 className="font-semibold mb-2">Étapes du Workflow:</h4>
                    <div className="space-y-2">
                        {wf.steps.map(step => (
                            <div key={step.id} className="border-l-2 pl-3">
                                <p className="font-medium">Étape {step.stepOrder}</p>
                                <StepDetail step={step} />
                            </div>
                        ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
