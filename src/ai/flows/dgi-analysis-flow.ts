
'use server';
/**
 * @fileOverview Analyse une publication DGI pour extraire des données fiscales structurées.
 * 
 * - DgiAnalysisInputSchema : Titre et contenu de la publication.
 * - DgiAnalysisOutputSchema : Résumé, impact, points clés et variables numériques.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DgiAnalysisInputSchema = z.object({
  title: z.string(),
  content: z.string().describe('Le contenu textuel de la publication DGI.'),
});

const DgiAnalysisOutputSchema = z.object({
  summary: z.string().describe('Un résumé court et clair de la publication en français.'),
  impactLevel: z.enum(['critique', 'important', 'informatif', 'aucun']).describe('Le niveau d\'impact sur la comptabilité des abonnés.'),
  keyPoints: z.array(z.string()).describe('Liste des 3 à 5 points essentiels à retenir.'),
  affectedModules: z.array(z.string()).describe('Modules du SaaS impactés (ex: TVA, IBS, IRG, Paie, IFU).'),
  extractedVariables: z.array(z.object({
    name: z.string().describe('Nom complet de la variable fiscale (ex: Taux de TVA Normal).'),
    code: z.string().describe('Code technique suggéré en MAJUSCULES (ex: TVA_STD).'),
    value: z.string().describe('La nouvelle valeur détectée (nombre ou pourcentage).'),
    effectiveDate: z.string().describe('Date d\'entrée en vigueur au format YYYY-MM-DD.'),
  })).optional().describe('Variables numériques extraites pour injection automatique.'),
});

export type DgiAnalysisOutput = z.infer<typeof DgiAnalysisOutputSchema>;

export async function analyzeDgiPublication(input: { title: string, content: string }): Promise<DgiAnalysisOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `Analyse cette publication officielle de la Direction Générale des Impôts (DGI) Algérie :
    
    TITRE: ${input.title}
    CONTENU: ${input.content}
    
    Ton rôle est d'aider un SaaS de comptabilité à comprendre si cette publication change des règles de calcul.
    
    Instructions :
    1. Sois extrêmement précis sur les chiffres (taux, seuils, plafonds).
    2. Identifie les dates d'effet. Si non mentionnée, suppose le début de l'année en cours.
    3. Traduis les implications juridiques complexes en "Points clés" simples pour un comptable.
    4. Suggère des codes variables pour les taux (ex: TVA_19, IRG_BAREME_2026, SNMG).
    
    Si la publication est juste informative (ex: rappel de délai), mets l'impact sur 'informatif'.`,
    output: { schema: DgiAnalysisOutputSchema },
    system: `Tu es un expert en fiscalité algérienne et en analyse de données juridiques pour un SaaS financier. 
    Tu dois extraire des données structurées exploitables par un programme informatique.`
  });

  if (!output) {
    throw new Error("L'IA n'a pas pu analyser la publication.");
  }

  return output;
}
