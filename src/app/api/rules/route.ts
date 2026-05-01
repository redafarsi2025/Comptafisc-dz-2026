
// src/app/api/rules/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/firebase/admin'; // Helper pour initialiser l'app admin
import { BudgetRule } from '@/models/rules.models';

/**
 * Récupère toutes les règles budgétaires pour le tenant.
 * GET /api/rules
 */
export async function GET(request: NextRequest) {
  try {
    await initAdminApp();
    const db = getFirestore();

    // TODO: Implémenter une vraie authentification et extraction du tenantId
    const tenantId = request.headers.get('x-tenant-id'); // Exemple
    if (!tenantId) {
      return NextResponse.json({ error: 'x-tenant-id header manquant' }, { status: 400 });
    }

    const rulesRef = db.collection('budget_rules');
    const q = rulesRef.where('tenantId', '==', tenantId);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const rules: BudgetRule[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetRule));
    
    return NextResponse.json(rules, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de la récupération des règles: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Crée une nouvelle règle budgétaire.
 * POST /api/rules
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

    // Validation simple
    if (!body.name || !body.eventType || !body.conditions || !body.actions) {
         return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    const newRule: Omit<BudgetRule, 'id'> = {
        tenantId,
        name: body.name,
        description: body.description || '',
        eventType: body.eventType,
        conditions: body.conditions,
        actions: body.actions,
        priority: body.priority || 100,
        isActive: body.isActive === undefined ? true : body.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('budget_rules').add(newRule);
    const createdRule = { id: docRef.id, ...newRule };

    return NextResponse.json(createdRule, { status: 201 });

  } catch (error: any) {
    console.error("Erreur lors de la création de la règle: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
