'use server';
/**
 * @fileOverview Analyse et extrait des variables fiscales structurées à partir de texte brut.
 * 
 * - parseFiscalUpdate - Extrait les codes variables, valeurs et dates d'effet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FiscalUpdateInputSchema = z.object({
  text: z.string().describe('Le texte brut décrivant les changements de taux ou de seuils fiscaux.'),
});

const FiscalUpdateOutputSchema = z.object({
  proposals: z.array(z.object({
    variableCode: z.string().describe('Le code machine de la variable (ex: TVA_STD, SNMG, IBS_PROD).'),
    variableName: z.string().describe('Le nom lisible de la variable.'),
    value: z.string().describe('La nouvelle valeur extraite.'),
    effectiveStartDate: z.string().describe('La date d\'effet au format YYYY-MM-DD.'),
    notes: z.string().describe('Explication courte de la provenance ou du contexte.')
  })).describe('Liste des mises à jour détectées dans le texte.')
});

export type FiscalUpdateOutput = z.infer<typeof FiscalUpdateOutputSchema>;

export async function parseFiscalUpdate(input: { text: string }): Promise<FiscalUpdateOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    input: input.text,
    output: { schema: FiscalUpdateOutputSchema },
    system: `Tu es un expert en réglementation fiscale algérienne. 
    Ton rôle est d'extraire des données structurées à partir de textes officiels (Loi de Finances, circulaires DGI).
    Utilise les codes de variables standards suivants si possible : 
    - TVA_STD, TVA_RED
    - TAP_RATE
    - SNMG
    - IFU_PROD, IFU_SERV, IFU_AUTO
    - IBS_PROD, IBS_BTP, IBS_SERV
    - IRG_LIMIT
    Si une variable n'est pas dans la liste, invente un code pertinent en MAJUSCULES.
    Assure-toi que les dates sont au format ISO YYYY-MM-DD.`
  });

  return output!;
}
