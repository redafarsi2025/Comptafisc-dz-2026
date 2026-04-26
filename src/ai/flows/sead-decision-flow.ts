
'use server';
/**
 * @fileOverview Flow Genkit pour le Système Expert d'Aide à la Décision (SEAD).
 * Utilise les prompts structurés pour générer des recommandations prescriptives.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SEAD_PROMPTS, populatePrompt } from '@/lib/sead-prompts';

const SeadDecisionInputSchema = z.object({
  promptKey: z.string().describe('La clé du prompt dans le référentiel SEAD_PROMPTS.'),
  variables: z.record(z.any()).describe('Les données dynamiques à injecter dans le prompt.'),
});

export type SeadDecisionInput = z.infer<typeof SeadDecisionInputSchema>;

export async function getSeadRecommendation(input: SeadDecisionInput): Promise<string> {
  const template = SEAD_PROMPTS[input.promptKey as keyof typeof SEAD_PROMPTS];
  if (!template) {
    throw new Error(`Le template de prompt "${input.promptKey}" est introuvable.`);
  }

  const populatedPrompt = populatePrompt(template, input.variables);

  const { text } = await ai.generate({
    prompt: populatedPrompt,
    system: `Tu es le cerveau décisionnel de l'ERP ComptaFisc-DZ. 
    Ton rôle est de fournir des conseils de haut niveau en finance, management et fiscalité algérienne.
    Tes recommandations doivent être :
    1. Actionnables immédiatement.
    2. Chiffrées quand c'est possible.
    3. Conformes à la Loi de Finances 2026.
    4. Rédigées dans un style "Executive" (Direct, précis, sans jargon inutile).`
  });

  return text;
}
