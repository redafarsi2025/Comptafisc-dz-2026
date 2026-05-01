
// src/app/dashboard/rules/page.tsx
import React from 'react';
import { RuleBuilder } from '@/components/rules/RuleBuilder';

/**
 * Page principale pour la gestion des règles budgétaires.
 * Affiche le composant interactif RuleBuilder.
 */
export default function RulesPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Moteur de Règles</h1>
        <p className="text-muted-foreground mt-1">
          Créez et gérez les règles de validation budgétaire qui déclenchent les workflows d'approbation.
        </p>
      </header>
      
      <main>
        <RuleBuilder />
      </main>
    </div>
  );
}
