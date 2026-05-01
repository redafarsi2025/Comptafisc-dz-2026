
// src/app/api/workflows/tasks/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { WorkflowInstance } from '@/models/workflow.models';

/**
 * Récupère les tâches d'approbation en attente pour un utilisateur.
 * Le système fait correspondre le `userId` fourni avec le `roleRequired` dans l'étape actuelle.
 * GET /api/workflows/tasks
 */
export async function GET(request: NextRequest) {
  try {
    await initAdminApp();
    const db = getFirestore();

    const userId = request.headers.get('x-user-id');
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'x-tenant-id header manquant' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'x-user-id header manquant' }, { status: 400 });
    }

    const instancesSnap = await db.collection(`tenants/${tenantId}/workflow_instances`)
      .where('status', '==', 'IN_PROGRESS')
      .where(new FieldPath('currentStep', 'roleRequired'), '==', userId)
      .get();

    if (instancesSnap.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const tasks: WorkflowInstance[] = [];
    instancesSnap.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() } as WorkflowInstance);
    });

    return NextResponse.json(tasks, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de la récupération des tâches d'approbation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
