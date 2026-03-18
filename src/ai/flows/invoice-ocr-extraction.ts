'use server';
/**
 * @fileOverview Extracts key accounting data from an invoice image and proposes a pre-filled journal entry.
 *
 * - extractInvoiceData - A function that handles the invoice data extraction process.
 * - InvoiceOcrExtractionInput - The input type for the extractInvoiceData function.
 * - InvoiceOcrExtractionOutput - The return type for the extractInvoiceData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InvoiceOcrExtractionInputSchema = z.object({
  invoiceImage: z
    .string()
    .describe(
      "A photo of an invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InvoiceOcrExtractionInput = z.infer<typeof InvoiceOcrExtractionInputSchema>;

const InvoiceOcrExtractionOutputSchema = z.object({
  vendorName: z.string().describe('The name of the vendor on the invoice.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The date of the invoice in YYYY-MM-DD format.'),
  totalAmount: z.number().describe('The total amount of the invoice.'),
  tvaAmount: z.number().describe('The Taxe sur la Valeur Ajoutée (TVA) amount.'),
  currency: z.string().describe('The currency of the invoice (e.g., DZD, EUR).'),
  items: z
    .array(
      z.object({
        description: z.string().describe('Description of the item.'),
        quantity: z.number().describe('Quantity of the item.'),
        unitPrice: z.number().describe('Unit price of the item.'),
        lineTotal: z.number().describe('Total for the line item.'),
      })
    )
    .optional()
    .describe('List of line items on the invoice, if available.'),
  suggestedJournalEntry: z.object({
    debitAccounts: z
      .array(
        z.object({
          accountCode: z.string().describe('The account code (e.g., 607, 4456).'),
          accountName: z.string().describe('The name of the account.'),
          amount: z.number().describe('The debit amount.'),
        })
      )
      .describe('List of debit entries.'),
    creditAccounts: z
      .array(
        z.object({
          accountCode: z.string().describe('The account code (e.g., 401).'),
          accountName: z.string().describe('The name of the account.'),
          amount: z.number().describe('The credit amount.'),
        })
      )
      .describe('List of credit entries.'),
    description: z.string().describe('A brief description for the journal entry.'),
  }).describe('Suggested journal entry based on the extracted invoice data.'),
});
export type InvoiceOcrExtractionOutput = z.infer<typeof InvoiceOcrExtractionOutputSchema>;

export async function extractInvoiceData(
  input: InvoiceOcrExtractionInput
): Promise<InvoiceOcrExtractionOutput> {
  return invoiceOcrExtractionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'invoiceOcrExtractionPrompt',
  input: { schema: InvoiceOcrExtractionInputSchema },
  output: { schema: InvoiceOcrExtractionOutputSchema },
  prompt: `You are an expert accounting assistant specialized in Algerian fiscal regulations (SCF). Your task is to extract key information from an invoice image and propose a suitable journal entry.

Extract the following details from the invoice:
- Vendor Name
- Invoice Number
- Invoice Date (format YYYY-MM-DD)
- Total Amount
- TVA (Taxe sur la Valeur Ajoutée) amount
- Currency
- Individual line items (description, quantity, unit price, line total) if clearly visible.

Based on the extracted information, propose a complete journal entry following the Algerian Chart of Accounts (SCF) principles. Assume the invoice is for a purchase of goods/services by the company. Typical accounts used are:
- Purchases (e.g., 607)
- Input TVA (e.g., 4456)
- Vendor Account (e.g., 401)

Ensure the debit and credit amounts balance. Provide a brief description for the journal entry.

Invoice Image: {{media url=invoiceImage}}`,
});

const invoiceOcrExtractionFlow = ai.defineFlow(
  {
    name: 'invoiceOcrExtractionFlow',
    inputSchema: InvoiceOcrExtractionInputSchema,
    outputSchema: InvoiceOcrExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
