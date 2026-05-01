
// src/app/api/workflows/history/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { WorkflowInstance } from '@/models/workflow.models';

/**
 * Récupère l'historique de toutes les instances de workflow pour un tenant.
 * GET /api/workflows/history
 */
export async function GET(request: NextRequest) {
  try {
    await initAdminApp();
    const db = getFirestore();

    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'x-tenant-id header manquant' }, { status: 400 });
    }

    // Pour une vraie application, ajoutez la pagination ici.
    const instancesSnap = await db.collection(`tenants/${tenantId}/workflow_instances`)
                                  .orderBy('createdAt', 'desc')
                                  .limit(100) // Limiter les résultats pour la performance
                                  .get();

    if (instancesSnap.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const instances: WorkflowInstance[] = [];
    instancesSnap.forEach(doc => {
      instances.push({ id: doc.id, ...doc.data() } as WorkflowInstance);
    });

    return NextResponse.json(instances, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de la récupération de l'historique des workflows:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
