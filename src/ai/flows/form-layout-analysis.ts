'use server';
/**
 * @fileOverview Analyse la mise en page d'un formulaire DGI pour détecter les champs de saisie.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FormLayoutAnalysisInputSchema = z.object({
  imageUrl: z.string().describe("L'URL de l'image ou du scan du formulaire DGI."),
  documentTitle: z.string().describe("Le titre ou type de document (ex: G50, G4)."),
});

const FormFieldSchema = z.object({
  name: z.string().describe("Nom lisible du champ (ex: Case 101, NIF)."),
  x: z.number().describe("Position X en pixels (base 800px de large)."),
  y: z.number().describe("Position Y en pixels."),
  width: z.number().describe("Largeur suggérée du champ."),
  variableSuggestion: z.string().optional().describe("Variable système suggérée (TENANT_NIF, TVA_AMT, etc.)."),
});

const FormLayoutAnalysisOutputSchema = z.object({
  detectedFields: z.array(FormFieldSchema),
  confidenceScore: z.number(),
  summary: z.string(),
});

export type FormLayoutAnalysisOutput = z.infer<typeof FormLayoutAnalysisOutputSchema>;

export async function analyzeFormLayout(input: { imageUrl: string, documentTitle: string }): Promise<FormLayoutAnalysisOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: [
      { media: { url: input.imageUrl } },
      { text: `Analyse visuellement ce formulaire fiscal algérien : ${input.documentTitle}.
      Identifie toutes les zones de saisie vides (cases, lignes pointillées).
      Pour chaque zone, estime ses coordonnées X (0 à 800) et Y, sa largeur, et suggère un nom de champ.
      Tente de mapper les champs sur ces variables connues : TENANT_NAME, TENANT_NIF, TENANT_ADDRESS, TOTAL_TVA, IRG_AMT, IBS_AMT.` }
    ],
    output: { schema: FormLayoutAnalysisOutputSchema },
    system: "Tu es un expert en traitement de documents administratifs. Tu extrais la structure géométrique des formulaires pour permettre leur remplissage automatique."
  });

  if (!output) throw new Error("Échec de l'analyse visuelle du formulaire.");
  return output;
}
