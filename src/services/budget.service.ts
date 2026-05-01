
/**
 * @fileoverview Service de données pour le module de gestion budgétaire.
 * @description Ce fichier centralise toutes les interactions avec Firestore
 *              pour les collections liées au budget.
 */

import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Budget, BudgetSection, BudgetLine } from '@/models/budget.models';

/**
 * Représente l'ensemble des données budgétaires pour un exercice.
 */
export interface FullBudgetData {
  budget: Budget;
  sections: BudgetSection[];
  lines: BudgetLine[];
}

/**
 * Récupère l'intégralité des données budgétaires (budget, sections, lignes)
 * pour un tenant et une année fiscale donnés.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant (dossier).
 * @param fiscalYear - L'année de l'exercice recherché.
 * @returns Un objet contenant les données budgétaires, ou null si non trouvé.
 */
export async function getBudgetByTenant(
  db: Firestore,
  tenantId: string,
  fiscalYear: number
): Promise<FullBudgetData | null> {
  if (!tenantId) return null;

  // 1. Récupérer le document principal du budget
  const budgetQuery = query(
    collection(db, 'budgets'),
    where('tenantId', '==', tenantId),
    where('fiscalYear', '==', fiscalYear)
  );
  const budgetSnapshot = await getDocs(budgetQuery);

  if (budgetSnapshot.empty) {
    console.warn(`Aucun budget trouvé pour le tenant ${tenantId} en ${fiscalYear}`);
    return null;
  }

  const budgetDoc = budgetSnapshot.docs[0];
  const budget = { id: budgetDoc.id, ...budgetDoc.data() } as Budget;

  // 2. Récupérer les sections et les lignes associées à ce budget
  const sectionsQuery = query(collection(db, 'budget_sections'), where('budgetId', '==', budget.id));
  const linesQuery = query(collection(db, 'budget_lines'), where('budgetId', '==', budget.id));

  const [sectionsSnapshot, linesSnapshot] = await Promise.all([
    getDocs(sectionsQuery),
    getDocs(linesQuery),
  ]);

  const sections = sectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetSection));
  const lines = linesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetLine));

  return {
    budget,
    sections,
    lines,
  };
}
