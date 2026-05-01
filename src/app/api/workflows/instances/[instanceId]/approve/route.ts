
// src/app/api/workflows/instances/[instanceId]/approve/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { approveStep } from '@/services/approval.engine';

interface ApproveParams {
  params: { instanceId: string };
}

/**
 * Approuve une étape d'un workflow.
 * POST /api/workflows/instances/{instanceId}/approve
 */
export async function POST(request: NextRequest, { params }: ApproveParams) {
    try {
        await initAdminApp();
        const db = getFirestore();
        const { instanceId } = params;

        // TODO: Extraire le vrai ID de l'utilisateur depuis le token d'authentification
        const body = await request.json();
        const { userId } = body;
        if (!userId) {
            return NextResponse.json({ error: 'userId manquant dans le corps de la requête' }, { status: 400 });
        }

        await approveStep(db, instanceId, userId);

        return NextResponse.json({ message: `Étape du workflow ${instanceId} approuvée.` }, { status: 200 });

    } catch (error: any) {
        console.error(`Erreur lors de l'approbation du workflow ${params.instanceId}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
