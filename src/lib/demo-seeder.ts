'use client';

import { Firestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { DEMO_DATASET } from './demo-dataset';

/**
 * Seeds a comprehensive demo tenant for a specific user.
 */
export async function seedDemoForUser(db: Firestore, userId: string, email: string) {
  const tenantId = `DEMO_${userId.substring(0, 5)}_${Date.now().toString().slice(-4)}`;
  const enterprise = DEMO_DATASET.enterprises[0]; // Bensalem Commerce par défaut

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
        clientId: "CLIENT_GENERIC",
        clientName: inv.clientName,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.date,
        totalAmountExcludingTax: inv.amountHT,
        totalTaxAmount: Math.round(inv.amountHT * (inv.tvaRate / 100)),
        totalAmountIncludingTax: Math.round(inv.amountHT * (1 + inv.tvaRate / 100)),
        paymentMethod: "Virement",
        status: 'Issued',
        tenantId,
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
        createdAt: new Date().toISOString(),
        createdByUserId: userId
      });
    }

    // 4. Add Employees
    const employeesRef = collection(db, "tenants", tenantId, "employees");
    for (const emp of DEMO_DATASET.employees) {
      await addDoc(employeesRef, {
        ...emp,
        tenantId,
        createdAt: new Date().toISOString()
      });
    }

    return tenantId;
  } catch (e) {
    console.error("Seeding failed", e);
    throw e;
  }
}