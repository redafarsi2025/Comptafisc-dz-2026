
// src/app/dashboard/history/page.tsx
import React from 'react';
import { HistoryViewer } from '@/components/history/HistoryViewer';

/**
 * Page pour visualiser l'historique et l'audit des instances de workflow.
 */
export default function HistoryPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Historique des Demandes</h1>
            <p className="text-muted-foreground mt-1">
                Suivez le parcours de chaque demande, de sa création à sa résolution.
            </p>
        </header>

        <main>
            <HistoryViewer />
        </main>
    </div>
  );
}
