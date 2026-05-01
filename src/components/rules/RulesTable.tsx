
// src/components/rules/RulesTable.tsx
'use client';

import React from 'react';
import { BudgetRule } from '@/models/rules.models';

interface RulesTableProps {
  rules: BudgetRule[];
}

export function RulesTable({ rules }: RulesTableProps) {
  if (rules.length === 0) {
    return <p className="p-4 text-center text-muted-foreground">Aucune règle définie pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-border">
            <thead className="bg-muted/40">
                <tr>
                    <th className="px-4 py-2 text-left font-semibold">Nom</th>
                    <th className="px-4 py-2 text-left font-semibold">Événement</th>
                    <th className="px-4 py-2 text-left font-semibold">Priorité</th>
                    <th className="px-4 py-2 text-left font-semibold">Statut</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                    <tr key={rule.id}>
                        <td className="px-4 py-3 font-medium">{rule.name}</td>
                        <td className="px-4 py-3">{rule.eventType}</td>
                        <td className="px-4 py-3">{rule.priority}</td>
                        <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {rule.isActive ? 'Actif' : 'Inactif'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
}
