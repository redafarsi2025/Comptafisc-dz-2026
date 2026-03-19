'use server';
/**
 * @fileOverview Analyse la mise en page d'un formulaire DGI pour détecter les champs de saisie.
 * Supporte désormais l'envoi direct de données (Base64) et le format PDF.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FormLayoutAnalysisInputSchema = z.object({
  fileDataUri: z.string().describe("Le contenu du fichier en Data URI (base64)."),
  documentTitle: z.string().describe("Le titre ou type de document (ex: G50, G4)."),
});

const FormFieldSchema = z.object({
  name: z.string().describe("Nom lisible du champ (ex: Case 101, NIF)."),
  x: z.number().describe("Position X en pixels (base 800px de large)."),
  y: z.number().describe("Position Y en pixels."),
  width: z.number().describe("Largeur suggérée du champ."),
  variableSuggestion: z.string().optional().describe("Variable système suggérée : TENANT_NAME, TENANT_NIF, TOTAL_TVA, IRG_AMT, IBS_AMT, STAMP_DUTY, TAP_AMT, ADRESSE, WILAYA."),
});

const FormLayoutAnalysisOutputSchema = z.object({
  detectedFields: z.array(FormFieldSchema),
  confidenceScore: z.number(),
  summary: z.string(),
});

export type FormLayoutAnalysisOutput = z.infer<typeof FormLayoutAnalysisOutputSchema>;

export async function analyzeFormLayout(input: { fileDataUri: string, documentTitle: string }): Promise<FormLayoutAnalysisOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: [
      { media: { url: input.fileDataUri } },
      { text: `Analyse visuellement ce formulaire fiscal algérien : ${input.documentTitle}.
      
      TON RÔLE : 
      1. Identifie TOUTES les zones de saisie vides (cases, lignes pointillées, rectangles).
      2. Pour chaque zone, estime ses coordonnées X (0 à 800) et Y, sa largeur.
      3. ESSENTIEL : Regarde le texte à côté ou au-dessus de la case pour deviner quelle variable système doit y être injectée.
      
      LISTE DES VARIABLES SYSTÈME CONNUES :
      - TENANT_NAME : Nom de l'entreprise
      - TENANT_NIF : Numéro d'identification fiscale
      - TENANT_ADDRESS : Adresse complète
      - TOTAL_TVA : Montant total de la TVA à verser (Case 101 ou similaire)
      - IRG_AMT : IRG Salariés
      - IBS_AMT : Acomptes IBS
      - STAMP_DUTY : Droits de timbre
      - TAP_AMT : Taxe sur l'activité professionnelle
      - PERIOD : Mois ou année de déclaration
      
      Retourne une suggestion de variable pour chaque champ détecté.` }
    ],
    output: { schema: FormLayoutAnalysisOutputSchema },
    system: "Tu es un expert en traitement de formulaires administratifs DGI Algérie. Tu extrais la structure géométrique et sémantique pour permettre le remplissage automatique par un programme."
  });

  if (!output) throw new Error("Échec de l'analyse visuelle du formulaire.");
  return output;
}
