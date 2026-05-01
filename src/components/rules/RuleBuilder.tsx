
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BudgetRule } from '@/models/rules.models';
import { RulesTable } from './RulesTable';
import { NewRuleForm } from './NewRuleForm';

/**
 * Le composant principal pour la construction et la gestion des règles.
 * Il gère l'état, la récupération des données et la création de nouvelles règles.
 */
export function RuleBuilder() {
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = 'tenant-123'; // TODO: Remplacer par une vraie gestion du tenant

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rules', {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      setRules(data);
    } catch (e: any) {
      setError('Impossible de charger les règles.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleRuleCreated = (newRule: BudgetRule) => {
    // Re-fetch la liste pour afficher la nouvelle règle
    fetchRules();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Nouvelle Règle</h2>
        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <NewRuleForm onRuleCreated={handleRuleCreated} tenantId={tenantId} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Règles Actuelles</h2>
        <div className="border rounded-lg shadow-sm bg-card">
          {isLoading && <p className="p-4 text-center">Chargement des règles...</p>}
          {error && <p className="p-4 text-center text-red-500">{error}</p>}
          {!isLoading && !error && <RulesTable rules={rules} />}
        </div>
      </div>
    </div>
  );
}
