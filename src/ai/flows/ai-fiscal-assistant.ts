'use server';
/**
 * @fileOverview An AI Fiscal Assistant flow that answers questions about Algerian fiscal regulations
 * using a legal corpus and provides citations.
 *
 * - askFiscalQuestion - A function that handles the fiscal question answering process.
 * - AiFiscalAssistantInput - The input type for the askFiscalQuestion function.
 * - AiFiscalAssistantOutput - The return type for the askFiscalQuestion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiFiscalAssistantInputSchema = z.object({
  question: z.string().describe('The user\'s natural language question about Algerian fiscal regulations.'),
});
export type AiFiscalAssistantInput = z.infer<typeof AiFiscalAssistantInputSchema>;

const AiFiscalAssistantOutputSchema = z.object({
  answer: z.string().describe('The precise answer to the fiscal question.'),
  citations: z.array(z.string()).describe('A list of cited articles or regulations from the legal corpus.'),
});
export type AiFiscalAssistantOutput = z.infer<typeof AiFiscalAssistantOutputSchema>;

const retrieveLegalDocuments = ai.defineTool(
  {
    name: 'retrieveLegalDocuments',
    description: 'Retrieves relevant articles and regulations from the Algerian fiscal legal corpus (CIDTA/CTCA) based on a query.',
    inputSchema: z.object({
      query: z.string().describe('The search query or keywords to find relevant legal documents.'),
    }),
    outputSchema: z.array(z.string()).describe('A list of relevant legal document snippets, including article numbers and titles.'),
  },
  async (input) => {
    // In a real application, this would query Firestore or a vector database
    // (e.g., using a separate service in src/services/ for data access).
    // For this example, we provide mock data based on keywords.
    const queryLower = input.query.toLowerCase();
    if (queryLower.includes('tva')) {
      return [
        "Article 1 de la Loi de Finances 2024: La Taxe sur la Valeur Ajoutée (TVA) est un impôt indirect qui frappe la consommation de biens et de services.",
        "Article 2 de la Loi de Finances 2024: Le taux normal de la TVA est de 19%. Certains biens et services bénéficient de taux réduits de 9% ou 0%."
      ];
    } else if (queryLower.includes('irg')) {
      return [
        "Article 5 du Code des Impôts Directs et Taxes Assimilées (CIDTA): L'Impôt sur le Revenu Global (IRG) est un impôt annuel qui frappe le revenu des personnes physiques.",
        "Article 6 du CIDTA: Les barèmes de l'IRG sont progressifs et dépendent de la nature du revenu et de la situation familiale du contribuable."
      ];
    } else if (queryLower.includes('stamp duty') || queryLower.includes('droit de timbre')) {
      return [
        "Article 15 de la Loi de Finances Complémentaire 2025: Le droit de timbre est une taxe exigée sur certains actes et documents, dont les factures.",
        "Article 16 de la LFC 2025: Le calcul du droit de timbre sur les factures est progressif et dépend du montant de la transaction et du mode de paiement."
      ];
    } else {
      return ["No specific legal documents found for the query in the legal corpus. Please refine your question or try a different topic. (Source: CIDTA/CTCA)"];
    }
  }
);

// Schema for the prompt's input, which includes the retrieved documents
const AiFiscalAssistantPromptInputSchema = z.object({
  question: z.string().describe('The user\'s question about Algerian fiscal regulations.'),
  retrievedDocuments: z.array(z.string()).describe('Relevant articles and regulations from the legal corpus retrieved by the tool.'),
});

const aiFiscalAssistantPrompt = ai.definePrompt({
  name: 'aiFiscalAssistantPrompt',
  input: { schema: AiFiscalAssistantPromptInputSchema },
  output: { schema: AiFiscalAssistantOutputSchema },
  prompt: `You are an AI Fiscal Assistant specialized in Algerian tax and payroll regulations.
Your goal is to provide precise and accurate answers to user questions, always citing the relevant articles from the legal corpus.
Use only the information provided in the 'Retrieved Legal Documents' section to formulate your answer and citations.
If the retrieved documents do not contain enough information to fully answer the question, state that you couldn't find enough information within the provided corpus.

User's Question: {{{question}}}

Retrieved Legal Documents:
{{#each retrievedDocuments}}
- {{{this}}}
{{/each}}

Based on the above, provide a precise answer and list all relevant citations.`,
});

const aiFiscalAssistantFlow = ai.defineFlow(
  {
    name: 'aiFiscalAssistantFlow',
    inputSchema: AiFiscalAssistantInputSchema,
    outputSchema: AiFiscalAssistantOutputSchema,
  },
  async (input) => {
    // Step 1: Use the defined tool to retrieve relevant legal documents based on the user's question.
    const retrievedDocs = await retrieveLegalDocuments({ query: input.question });

    // Step 2: Call the prompt with the original question and the retrieved documents.
    const { output } = await aiFiscalAssistantPrompt({
      question: input.question,
      retrievedDocuments: retrievedDocs,
    });

    return output!;
  }
);

export async function askFiscalQuestion(input: AiFiscalAssistantInput): Promise<AiFiscalAssistantOutput> {
  return aiFiscalAssistantFlow(input);
}
