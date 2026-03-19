'use client';

import { Firestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { DEMO_DATASET } from './demo-dataset';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';

/**
 * Seeds a comprehensive demo tenant for a specific user.
 */
export async function seedDemoForUser(db: Firestore, userId: string, email: string) {
  const tenantId = `DEMO_${userId.substring(0, 5)}_${Date.now().toString().slice(-4)}`;
  const enterprise = DEMO_DATASET.enterprises[0]; // Bensalem Commerce

  const tenantRef = doc(db, "tenants", tenantId);
  const tenantData = {
    ...enterprise,
    id: tenantId,
    isDemo: true,
    createdAt: new Date().toISOString(),
    members: { [userId]: 'owner' }
  };

  try {
    // 1. Create Tenant
    await setDoc(tenantRef, tenantData);

    // 2. Add Invoices
    const invoicesRef = collection(db, "tenants", tenantId, "invoices");
    for (const inv of DEMO_DATASET.invoices) {
      await addDoc(invoicesRef, {
        ...inv,
        tenantId,
        status: 'Issued',
        totalAmountIncludingTax: inv.amountHT * (1 + inv.tvaRate/100),
        totalTaxAmount: inv.amountHT * (inv.tvaRate/100),
        totalAmountExcludingTax: inv.amountHT,
        tenantMembers: { [userId]: 'owner' },
        createdAt: new Date().toISOString(),
        createdByUserId: userId
      });
    }

    // 3. Add Journal Entries
    const entriesRef = collection(db, "tenants", tenantId, "journal_entries");
    for (const entry of DEMO_DATASET.journalEntries) {
      await addDoc(entriesRef, {
        entryDate: entry.date,
        description: entry.description,
        journalType: entry.type,
        documentReference: entry.ref,
        status: 'Validated',
        lines: entry.lines,
        tenantId,
        tenantMembers: { [userId]: 'owner' },
        createdAt: new Date().toISOString(),
        createdByUserId: userId
      });
    }

    return tenantId;
  } catch (e) {
    console.error("Seeding failed", e);
    throw e;
  }
}
