
'use client';

import { Firestore, collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { getCompletePlanForSector, AccountTemplateLine } from '@/lib/scf-templates';

/**
 * Service de gestion du Plan Comptable Client.
 */
export async function initializeClientChartOfAccounts(db: Firestore, tenantId: string, sector: string) {
  const accountsRef = collection(db, "tenants", tenantId, "accounts");
  
  // 1. Vérifier si le plan existe déjà
  const existingSnap = await getDocs(query(accountsRef, where("isActive", "==", true)));
  if (!existingSnap.empty) {
    throw new Error("Le plan comptable est déjà initialisé pour ce dossier.");
  }

  const batch = writeBatch(db);
  const plan = getCompletePlanForSector(sector);

  // 2. Cloner le modèle vers l'instance client
  plan.forEach((acc) => {
    const newAccRef = doc(accountsRef);
    batch.set(newAccRef, {
      accountNumber: acc.number,
      label: acc.label,
      type: acc.type,
      class: acc.class,
      isCustom: false,
      isActive: true,
      templateOriginId: 'DEFAULT_2026',
      createdAt: new Date().toISOString()
    });
  });

  await batch.commit();
  return plan.length;
}

export async function addCustomAccount(db: Firestore, tenantId: string, account: Omit<AccountTemplateLine, 'class'>) {
  const accountsRef = collection(db, "tenants", tenantId, "accounts");
  await addDoc(accountsRef, {
    accountNumber: account.number,
    label: acc.label,
    type: acc.type,
    class: parseInt(account.number.charAt(0)),
    isCustom: true,
    isActive: true,
    createdAt: new Date().toISOString()
  });
}
