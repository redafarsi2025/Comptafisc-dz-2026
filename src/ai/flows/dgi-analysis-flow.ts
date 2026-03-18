
'use server';
/**
 * @fileOverview Analyse une publication DGI pour extraire des données fiscales structurées.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DgiAnalysisInputSchema = z.object({
  title: z.string(),
  content: z.string().describe('Le contenu textuel de la publication DGI.'),
});

const DgiAnalysisOutputSchema = z.object({
  summary: z.string().describe('Un résumé court de la publication.'),
  impactLevel: z.enum(['critique', 'important', 'informatif', 'aucun']),
  keyPoints: z.array(z.string()).describe('Points clés extraits.'),
  affectedModules: z.array(z.string()).describe('Modules SaaS impactés (TVA, IBS, IRG, Paie...).'),
  extractedVariables: z.array(z.object({
    name: z.string().describe('Nom de la variable fiscale (ex: Taux TVA Normal).'),
    code: z.string().describe('Code machine suggéré (ex: TVA_STD).'),
    value: z.string().describe('La nouvelle valeur détectée.'),
    effectiveDate: z.string().describe('Date d\'effet au format YYYY-MM-DD.'),
  })).optional(),
});

export type DgiAnalysisOutput = z.infer<typeof DgiAnalysisOutputSchema>;

export async function analyzeDgiPublication(input: { title: string, content: string }): Promise<DgiAnalysisOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analyse cette publication officielle de la DGI Algérie :
    TITRE: ${input.title}
    CONTENU: ${input.content}
    
    Identifie si cette publication modifie des taux, des seuils ou des échéances fiscales.
    Sois précis sur les valeurs numériques et les dates d'effet.`,
    output: { schema: DgiAnalysisOutputSchema },
    system: `Tu es un expert en fiscalité algérienne. Ton rôle est d'aider un SaaS comptable à rester à jour avec les dernières lois de finances.
    Impact critique : Changement de taux ou de seuil immédiat.
    Impact important : Nouvelle obligation déclarative ou prorogation de délai.
    Impact informatif : Rappel de règles existantes.`
  });

  if (!output) throw new Error("Échec de l'analyse IA");
  return output;
}
