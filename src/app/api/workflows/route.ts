
// src/app/api/workflows/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { Workflow, WorkflowStep } from '@/models/workflow.models';

interface WorkflowWithSteps extends Workflow {
  steps: WorkflowStep[];
}

/**
 * Récupère tous les modèles de workflow pour le tenant, en incluant leurs étapes.
 * GET /api/workflows
 */
export async function GET(request: NextRequest) {
  try {
    await initAdminApp();
    const db = getFirestore();
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'x-tenant-id header manquant' }, { status: 400 });
    }

    const workflowsRef = db.collection('workflows').where('tenantId', '==', tenantId);
    const workflowsSnapshot = await workflowsRef.get();

    if (workflowsSnapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const stepsRef = db.collection('workflow_steps');
    const results: WorkflowWithSteps[] = [];

    for (const doc of workflowsSnapshot.docs) {
        const workflow = { id: doc.id, ...doc.data() } as Workflow;
        
        const stepsSnapshot = await stepsRef.where('workflowId', '==', workflow.id).orderBy('stepOrder').get();
        
        const steps: WorkflowStep[] = stepsSnapshot.docs.map(stepDoc => {
            return { id: stepDoc.id, ...stepDoc.data() } as WorkflowStep;
        });

        results.push({ ...workflow, steps });
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de la récupération des workflows: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


/**
 * Crée un nouveau modèle de workflow et ses étapes associées.
 * POST /api/workflows
 */
export async function POST(request: NextRequest) {
  try {
    await initAdminApp();
    const db = getFirestore();
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'x-tenant-id header manquant' }, { status: 400 });
    }

    const body = await request.json();
    const { name, eventType, steps } = body;

    if (!name || !eventType || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'Champs manquants ou invalides: name, eventType, steps[]' }, { status: 400 });
    }

    const batch = db.batch();
    const workflowRef = db.collection('workflows').doc();

    const newWorkflowData = {
        tenantId,
        name,
        eventType,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    batch.set(workflowRef, newWorkflowData);

    steps.forEach((step: any, index: number) => {
        const stepRef = db.collection('workflow_steps').doc();
        
        const newStepData: any = {
            workflowId: workflowRef.id,
            stepOrder: step.stepOrder || index + 1,
            roleRequired: step.roleRequired,
            autoApprove: step.autoApprove || false,
        };

        if (typeof step.minAmount === 'number') {
            newStepData.minAmount = step.minAmount;
        }
        if (typeof step.maxAmount === 'number') {
            newStepData.maxAmount = step.maxAmount;
        }

        batch.set(stepRef, newStepData);
    });

    await batch.commit();

    return NextResponse.json({ id: workflowRef.id, ...newWorkflowData, steps }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur lors de la création du workflow: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
