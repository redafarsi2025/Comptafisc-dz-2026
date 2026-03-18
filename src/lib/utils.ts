import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Génère une empreinte numérique SHA-256 pour une facture.
 * Utilisé pour la signature électronique du plan CABINET.
 */
export async function generateInvoiceHash(invoiceData: any): Promise<string> {
  const dataString = JSON.stringify({
    num: invoiceData.invoiceNumber,
    total: invoiceData.totalAmountIncludingTax,
    date: invoiceData.invoiceDate,
    tenant: invoiceData.tenantId,
    client: invoiceData.clientId
  });
  
  const msgUint8 = new TextEncoder().encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
