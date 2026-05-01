
/**
 * @fileoverview API Route pour la création sécurisée d'engagements budgétaires.
 * @description Ce endpoint exécute une transaction pour créer un bon de commande
 *              tout en vérifiant et en mettant à jour la ligne budgétaire associée.
 *              Cette approche garantit l'intégrité du budget.
 */

import { NextResponse } from 'next/server';
import { getFirestore, runTransaction, doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config'; // Assurez-vous que ce chemin est correct
import { PurchaseOrder } from '@/models/purchase.models';
import { BudgetLine } from '@/models/budget.models';
import { v4 as uuidv4 } from 'uuid';

// Initialiser Firebase (côté serveur)
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

/**
 * Gère la création d'un bon de commande avec contrôle budgétaire.
 * @param {Request} req - La requête entrante contenant les données du bon de commande.
 * @returns {NextResponse} La réponse JSON.
 */
export async function POST(req: Request) {
  try {
    const poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'> = await req.json();

    if (!poData.tenantId || !poData.budgetLineId || !poData.totalAmount) {
      return NextResponse.json({ error: 'Données du bon de commande incomplètes.' }, { status: 400 });
    }

    const newPurchaseOrderId = uuidv4();
    const newCommitmentId = uuidv4();

    // Exécuter la logique dans une transaction Firestore
    const result = await runTransaction(db, async (transaction) => {
      const budgetLineRef = doc(db, 'budget_lines', poData.budgetLineId);
      const budgetLineDoc = await transaction.get(budgetLineRef);

      if (!budgetLineDoc.exists()) {
        throw new Error('La ligne budgétaire spécifiée n\'existe pas.');
      }

      const budgetLine = budgetLineDoc.data() as BudgetLine;
      const availableAmount = budgetLine.allocatedAmount - budgetLine.committedAmount;

      // --- RÈGLE DE GESTION #1 : CONTRÔLE BUDGÉTAIRE ---
      if (availableAmount < poData.totalAmount) {
        throw new Error(`Dépassement de budget. Disponible: ${availableAmount}, Requis: ${poData.totalAmount}`);
      }

      // Si le budget est suffisant, procéder à la transaction
      
      // 1. Mettre à jour la ligne budgétaire
      const newCommittedAmount = budgetLine.committedAmount + poData.totalAmount;
      transaction.update(budgetLineRef, { committedAmount: newCommittedAmount });

      // 2. Créer le bon de commande
      const poRef = doc(db, 'purchase_orders', newPurchaseOrderId);
      const newPo: PurchaseOrder = {
        ...poData,
        id: newPurchaseOrderId,
        status: 'approved', // Le statut est directement 'approved' car le budget est validé
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };
      transaction.set(poRef, newPo);

      // 3. Créer l'engagement budgétaire
      const commitmentRef = doc(db, 'budget_commitments', newCommitmentId);
      transaction.set(commitmentRef, {
        id: newCommitmentId,
        tenantId: poData.tenantId,
        budgetLineId: poData.budgetLineId,
        referenceType: 'purchase_order',
        referenceId: newPurchaseOrderId,
        amount: poData.totalAmount,
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      return { purchaseOrderId: newPurchaseOrderId };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("Erreur de transaction d'engagement: ", error);
    // Retourner un message d'erreur spécifique pour le dépassement de budget
    if (error.message.includes('Dépassement de budget')) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ error: 'Erreur interne du serveur.', details: error.message }, { status: 500 });
  }
}
