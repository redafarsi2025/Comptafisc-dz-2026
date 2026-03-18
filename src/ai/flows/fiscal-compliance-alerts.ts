'use server';
/**
 * @fileOverview A Genkit flow for analyzing accounting entries and generating proactive
 * fiscal compliance alerts based on Algerian tax regulations.
 *
 * - fiscalComplianceAlerts - A function that handles the fiscal compliance alerts generation process.
 * - FiscalComplianceAlertsInput - The input type for the fiscalComplianceAlerts function.
 * - FiscalComplianceAlertsOutput - The return type for the fiscalComplianceAlerts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const FiscalComplianceAlertsInputSchema = z.object({
  accountingEntries: z.string().describe('A summary or detailed list of accounting entries for analysis. Provide this information in a clear and concise manner.'),
});
export type FiscalComplianceAlertsInput = z.infer<typeof FiscalComplianceAlertsInputSchema>;

// Output Schema
const FiscalComplianceAlertsOutputSchema = z.object({
  alerts: z.array(
    z.object({
      description: z.string().describe('A clear description of the potential fiscal compliance risk or discrepancy.'),
      severity: z.enum(['low', 'medium', 'high']).describe('The severity level of the identified risk.'),
      relevantRegulation: z.string().describe('A reference to the relevant Algerian tax regulation or law, including article numbers if possible.'),
    })
  ).describe('A list of proactive, context-aware alerts about potential fiscal compliance risks.'),
});
export type FiscalComplianceAlertsOutput = z.infer<typeof FiscalComplianceAlertsOutputSchema>;

// Wrapper function
export async function fiscalComplianceAlerts(
  input: FiscalComplianceAlertsInput
): Promise<FiscalComplianceAlertsOutput> {
  return fiscalComplianceAlertsFlow(input);
}

// Prompt definition
const prompt = ai.definePrompt({
  name: 'fiscalComplianceAlertsPrompt',
  input: { schema: FiscalComplianceAlertsInputSchema },
  output: { schema: FiscalComplianceAlertsOutputSchema },
  prompt: `You are an expert Algerian fiscal auditor and compliance specialist. Your task is to analyze the provided accounting entries for potential fiscal compliance risks or discrepancies, specifically referencing Algerian tax regulations.

Identify any issues that could lead to penalties, non-compliance, or incorrect tax declarations (TVA, TAP, IRG, IBS, IFU, CNAS, CASNOS, etc.). For each identified risk, provide:
1. A clear description of the risk.
2. A severity level (low, medium, or high).
3. A specific reference to the relevant Algerian tax regulation, law, or article number (e.g., "Code des Impôts Directs et Taxes Assimilées, Article 123" or "Loi de Finances 2024, Article 45"). If an exact article isn't known, provide the most relevant general law or code.

Focus on proactive alerts to help the user maintain adherence to the law.

Accounting entries to analyze:
{{{accountingEntries}}}`,
});

// Flow definition
const fiscalComplianceAlertsFlow = ai.defineFlow(
  {
    name: 'fiscalComplianceAlertsFlow',
    inputSchema: FiscalComplianceAlertsInputSchema,
    outputSchema: FiscalComplianceAlertsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('No output received from the prompt.');
    }
    return output;
  }
);
