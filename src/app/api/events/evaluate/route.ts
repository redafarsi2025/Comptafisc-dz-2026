
// src/app/api/events/evaluate/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin';
import { evaluateRules } from '@/services/rules.engine';
import { startWorkflow } from '@/services/workflow.engine';

/**
 * Point d'entrée principal.
 * Reçoit un événement métier, l'évalue contre les règles,
 * et déclenche potentiellement un workflow.
 * POST /api/events/evaluate
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
    const { eventType, payload } = body;

    if (!eventType || !payload) {
      return NextResponse.json({ error: 'eventType et payload sont requis' }, { status: 400 });
    }

    // 1. Évaluer les règles pour cet événement
    const evaluationResult = await evaluateRules(db, tenantId, eventType, payload);

    if (evaluationResult.triggeredRules.length === 0) {
        return NextResponse.json({ message: "Aucune règle n'a été déclenchée.", evaluationResult }, { status: 200 });
    }

    // 2. Vérifier si l'action de démarrer un workflow est requise
    const workflowAction = evaluationResult.actions.startWorkflow;
    if (workflowAction && workflowAction.workflowId) {
      
      // payload.id est supposé être l'ID de l'objet métier (ex: ID du bon de commande)
      if (!payload.id) {
          throw new Error("Le payload doit avoir une propriété 'id' pour démarrer un workflow.");
      }

      // 3. Démarrer le workflow
      const instance = await startWorkflow(
        db,
        tenantId,
        workflowAction.workflowId,
        eventType, // Le type d'entité est le même que le type d'événement
        payload.id,
        payload
      );
      
      return NextResponse.json({ 
          message: "Workflow démarré avec succès.", 
          workflowInstanceId: instance.id, 
          evaluationResult 
      }, { status: 201 });
    }

    // Si d'autres actions sont retournées par le moteur de règles, les traiter ici

    return NextResponse.json({ message: "Règles évaluées, aucune action de workflow.", evaluationResult }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de l'évaluation de l'événement: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
