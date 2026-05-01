
// src/components/rules/NewRuleForm.tsx
'use client';

import React, { useState } from 'react';
import { BudgetRule } from '@/models/rules.models';

interface NewRuleFormProps {
  onRuleCreated: (newRule: BudgetRule) => void;
  tenantId: string;
}

export function NewRuleForm({ onRuleCreated, tenantId }: NewRuleFormProps) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('PURCHASE_REQUEST');
  const [conditions, setConditions] = useState('');
  const [actions, setActions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    let parsedConditions, parsedActions;
    try {
        parsedConditions = JSON.parse(conditions);
        parsedActions = JSON.parse(actions);
    } catch (e) {
        setError("Les champs Conditions et Actions doivent être du JSON valide.");
        setIsSubmitting(false);
        return;
    }

    const newRuleData = {
      name,
      eventType,
      conditions: parsedConditions,
      actions: parsedActions,
      priority: 100, // Valeur par défaut
      isActive: true,
    };

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(newRuleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la création de la règle.');
      }

      const createdRule = await response.json();
      setSuccessMessage(`La règle "${createdRule.name}" a été créée avec succès!`);
      onRuleCreated(createdRule);

      // Réinitialiser le formulaire
      setName('');
      setConditions('');
      setActions('');

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-100 text-red-800 rounded-md">{error}</div>}
      {successMessage && <div className="p-3 bg-green-100 text-green-800 rounded-md">{successMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="ruleName" className="block text-sm font-medium mb-1">Nom de la règle</label>
                <input id="ruleName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border rounded-md" placeholder="Ex: Dépenses IT > 5000€" />
            </div>
            <div>
                <label htmlFor="eventType" className="block text-sm font-medium mb-1">Type d'événement</label>
                <select id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="PURCHASE_REQUEST">Demande d'achat</option>
                    <option value="EXPENSE_REPORT">Note de frais</option>
                    {/* Ajouter d'autres types d'événements ici */}
                </select>
            </div>
        </div>

      <div>
        <label htmlFor="conditions" className="block text-sm font-medium mb-1">Conditions (JSON)</label>
        <textarea id="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} required rows={5} className="w-full p-2 border rounded-md font-mono text-sm" placeholder='{\n  "all": [\n    {\n      "fact": "amount",\n      "operator": "greaterThan",\n      "value": 5000\n    }\n  ]\n}' />
      </div>

      <div>
        <label htmlFor="actions" className="block text-sm font-medium mb-1">Actions (JSON)</label>
        <textarea id="actions" value={actions} onChange={(e) => setActions(e.target.value)} required rows={4} className="w-full p-2 border rounded-md font-mono text-sm" placeholder='{\n  "startWorkflow": {\n    "workflowId": "wf_direction_financiere"\n  }\n}' />
      </div>

      <div>
        <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:bg-gray-300">
          {isSubmitting ? 'Création en cours...' : 'Créer la Règle'}
        </button>
      </div>
    </form>
  );
}
