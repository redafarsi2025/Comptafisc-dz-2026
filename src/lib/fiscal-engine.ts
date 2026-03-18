
'use client';

import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * Le FiscalEngine permet de récupérer les taux et seuils configurés par l'admin
 * en fonction d'une date d'opération. Cela garantit que si on recalcule une facture 
 * de 2023, on utilise les taux de 2023.
 */

export interface FiscalContext {
  db: Firestore;
  date: string; // ISO format
}

/**
 * Récupère la valeur d'une variable fiscale par son code machine (ex: 'TVA_STANDARD')
 * à une date précise.
 */
export async function getFiscalValue(ctx: FiscalContext, variableCode: string): Promise<any> {
  const { db, date } = ctx;

  // 1. Trouver le type de variable
  const typeQuery = query(
    collection(db, 'fiscal_variable_types'),
    where('code', '==', variableCode),
    limit(1)
  );
  const typeSnap = await getDocs(typeQuery);
  if (typeSnap.empty) {
    console.warn(`Variable fiscale inconnue : ${variableCode}`);
    return null;
  }
  const typeId = typeSnap.docs[0].id;

  // 2. Trouver la valeur effective la plus récente par rapport à la date demandée
  const valueQuery = query(
    collection(db, 'fiscal_variable_values'),
    where('fiscalVariableTypeId', '==', typeId),
    where('effectiveStartDate', '<=', date),
    orderBy('effectiveStartDate', 'desc'),
    limit(1)
  );

  const valueSnap = await getDocs(valueQuery);
  if (valueSnap.empty) {
    console.warn(`Aucune valeur définie pour ${variableCode} à la date du ${date}`);
    return null;
  }

  const data = valueSnap.docs[0].data();
  
  // Si le type attendu est JSON, on parse
  if (typeSnap.docs[0].data().dataType === 'json') {
    try {
      return JSON.parse(data.value);
    } catch (e) {
      return data.value;
    }
  }

  // Sinon on cast en nombre si possible
  const num = parseFloat(data.value);
  return isNaN(num) ? data.value : num;
}

/**
 * Exemple d'utilisation dans les calculs :
 * const tva = await getFiscalValue({ db, date: '2026-01-15' }, 'TVA_STANDARD_RATE');
 */
