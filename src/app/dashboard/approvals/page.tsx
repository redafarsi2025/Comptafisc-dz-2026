
// src/app/dashboard/approvals/page.tsx
import React from 'react';
import { ApprovalDashboard } from '@/components/approvals/ApprovalDashboard';

/**
 * Page principale pour le tableau de bord des approbations.
 */
export default function ApprovalsPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Tâches d'Approbation</h1>
            <p className="text-muted-foreground mt-1">
                Consultez et traitez les demandes qui requièrent votre attention.
            </p>
        </header>

        <main>
            <ApprovalDashboard />
        </main>
    </div>
  );
}
