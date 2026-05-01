'use client';

import { Firestore, collection, doc, writeBatch, getDocs, query, where, addDoc } from 'firebase/firestore';
import { getCompletePlanForSector, AccountTemplateLine } from '@/lib/scf-templates';

/**
 * Service de gestion du Plan Comptable Client.
 * Initialise ou réinitialise le plan bilingue en fonction du secteur d'activité.
 * @param force - Si true, supprime tous les comptes existants avant de réinitialiser.
 */
export async function initializeClientChartOfAccounts(db: Firestore, tenantId: string, sector: string, force: boolean = false) {
  const accountsRef = collection(db, "tenants", tenantId, "accounts");
  const existingSnap = await getDocs(accountsRef);

  // Si l'option force est activée, supprimer tous les comptes existants.
  if (force && !existingSnap.empty) {
    const deleteBatch = writeBatch(db);
    existingSnap.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
  } else if (!existingSnap.empty) {
    // Comportement par défaut : refuser si le plan existe déjà et que force n'est pas activé.
    throw new Error("Le plan comptable est déjà initialisé. Utilisez l'option de forçage pour écraser.");
  }

  // Procéder à l'initialisation
  const initBatch = writeBatch(db);
  const plan = getCompletePlanForSector(sector);

  plan.forEach((acc) => {
    const newAccRef = doc(accountsRef);
    initBatch.set(newAccRef, {
      accountNumber: acc.number,
      label: acc.label,
      labelAr: acc.labelAr,
      type: acc.type,
      class: acc.class,
      isCustom: false,
      isActive: true,
      templateOriginId: 'DEFAULT_2026',
      createdAt: new Date().toISOString()
    });
  });

  await initBatch.commit();
  return plan.length;
}

/**
 * Réinitialise uniquement les libellés (FR/AR) des comptes standards déjà existants.
 * Utile pour appliquer les traductions sur un plan déjà saisi.
 */
export async function resetClientAccountTranslations(db: Firestore, tenantId: string, sector: string) {
  const accountsRef = collection(db, "tenants", tenantId, "accounts");
  const existingSnap = await getDocs(accountsRef);
  
  if (existingSnap.empty) return 0;

  const batch = writeBatch(db);
  const templatePlan = getCompletePlanForSector(sector);
  let updatedCount = 0;

  existingSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const standardMatch = templatePlan.find(t => t.number === data.accountNumber);
    
    if (standardMatch) {
      batch.update(docSnap.ref, {
        label: standardMatch.label,
        labelAr: standardMatch.labelAr,
        updatedAt: new Date().toISOString()
      });
      updatedCount++;
    }
  });

  await batch.commit();
  return updatedCount;
}

export async function addCustomAccount(db: Firestore, tenantId: string, account: { number: string, label: string, type: any }) {
  const accountsRef = collection(db, "tenants", tenantId, "accounts");
  await addDoc(accountsRef, {
    accountNumber: account.number,
    label: account.label,
    type: account.type,
    class: parseInt(account.number.charAt(0)),
    isCustom: true,
    isActive: true,
    createdAt: new Date().toISOString()
  });
}
