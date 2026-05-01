
// src/components/workflows/NewWorkflowForm.tsx
'use client';

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface NewWorkflowFormProps {
  onWorkflowCreated: () => void;
  tenantId: string;
}

interface StepState {
  id: string; // Un ID local pour la gestion du state React
  roleRequired: string;
  minAmount: number | string;
  maxAmount: number | string;
}

export function NewWorkflowForm({ onWorkflowCreated, tenantId }: NewWorkflowFormProps) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('PURCHASE_REQUEST');
  const [steps, setSteps] = useState<StepState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const addStep = () => {
    setSteps([...steps, { id: uuidv4(), roleRequired: '', minAmount: '', maxAmount: '' }]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const handleStepChange = (id: string, field: keyof StepState, value: string) => {
    setSteps(steps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (steps.length === 0) {
        setError("Un workflow doit avoir au moins une étape.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const formattedSteps = steps.map((step, index) => ({
        stepOrder: index + 1,
        roleRequired: step.roleRequired,
        minAmount: step.minAmount === '' ? undefined : Number(step.minAmount),
        maxAmount: step.maxAmount === '' ? undefined : Number(step.maxAmount),
        autoApprove: false, // Fonctionnalité future
    }));

    const newWorkflowData = { name, eventType, steps: formattedSteps };

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(newWorkflowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la création du workflow.');
      }

      setSuccessMessage(`Workflow "${name}" créé avec succès!`);
      onWorkflowCreated();
      setName('');
      setSteps([]);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}
      {successMessage && <div className="p-3 bg-green-100 text-green-800 rounded-md">{successMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="wfName" className="block text-sm font-medium mb-1">Nom du modèle</label>
                <input id="wfName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border rounded-md" placeholder="Ex: Validation Standard > 1000€" />
            </div>
            <div>
                <label htmlFor="wfEventType" className="block text-sm font-medium mb-1">Déclenché par</label>
                <select id="wfEventType" value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="PURCHASE_REQUEST">Demande d'achat</option>
                    <option value="EXPENSE_REPORT">Note de frais</option>
                </select>
            </div>
        </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Étapes de Validation</h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="p-4 border rounded-md bg-muted/20 flex flex-wrap gap-4 items-end">
              <div className="font-bold text-lg mr-2">{index + 1}</div>
              <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium mb-1">Rôle Requis</label>
                  <input type="text" value={step.roleRequired} onChange={e => handleStepChange(step.id, 'roleRequired', e.target.value)} required className="w-full p-2 border rounded-md text-sm" placeholder="Ex: MANAGER" />
              </div>
              <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium mb-1">Montant Min (€)</label>
                  <input type="number" value={step.minAmount} onChange={e => handleStepChange(step.id, 'minAmount', e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="Optionnel" />
              </div>
              <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium mb-1">Montant Max (€)</label>
                  <input type="number" value={step.maxAmount} onChange={e => handleStepChange(step.id, 'maxAmount', e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="Optionnel" />
              </div>
              <button type="button" onClick={() => removeStep(step.id)} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">Supprimer</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addStep} className="mt-4 px-4 py-2 text-sm border border-dashed rounded-md hover:bg-muted">
          + Ajouter une étape
        </button>
      </div>

      <div className="pt-4 border-t">
        <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:bg-gray-300">
          {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder le Modèle'}
        </button>
      </div>
    </form>
  );
}
