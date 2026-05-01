
// src/app/api/workflows/instances/[instanceId]/reject/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { rejectWorkflow } from '@/services/approval.engine';

interface RejectParams {
  params: { instanceId: string };
}

/**
 * Rejette un workflow en cours.
 * POST /api/workflows/instances/{instanceId}/reject
 */
export async function POST(request: NextRequest, { params }: RejectParams) {
    try {
        await initAdminApp();
        const db = getFirestore();
        const { instanceId } = params;

        const body = await request.json();
        const { userId, reason } = body;

        if (!userId || !reason) {
            return NextResponse.json({ error: 'userId et reason sont requis' }, { status: 400 });
        }

        await rejectWorkflow(db, instanceId, userId, reason);

        return NextResponse.json({ message: `Workflow ${instanceId} rejeté.` }, { status: 200 });

    } catch (error: any) {
        console.error(`Erreur lors du rejet du workflow ${params.instanceId}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
