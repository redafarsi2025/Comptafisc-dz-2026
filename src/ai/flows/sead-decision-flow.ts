'use server';
/**
 * @fileOverview Flow Genkit pour le Système Expert d'Aide à la Décision (SEAD).
 * Utilise les prompts structurés pour générer des recommandations prescriptives.
 * Gère un mode Fallback Déterministe en cas d'échec de l'API AI.
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

  try {
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
  } catch (error) {
    console.error("[SEAD Flow] AI API Failure, switching to Deterministic Mode:", error);
    // Retourne une recommandation basée sur des règles métier fixes si l'IA échoue
    return getDeterministicFallback(input.promptKey, input.variables);
  }
}

/**
 * Moteur de décision déterministe (Fallback sans IA)
 * Utilise des algorithmes et templates fixes pour garantir une réponse métier même offline.
 */
function getDeterministicFallback(key: string, vars: any): string {
  let output = "### 🛡️ PLAN D'ACTION (MODE DÉTERMINISTE)\n";
  output += "*Note : L'IA est actuellement indisponible. Cette recommandation est générée par le moteur de règles métier standard.*\n\n";

  if (key === 'FISCAL_DECISION_CORE') {
    const ca = Number(vars.ca) || 0;
    const res = Number(vars.resultat) || 0;
    const cash = Number(vars.cash) || 0;
    const tva_c = Number(vars.tva_collectee) || 0;
    const tva_d = Number(vars.tva_deductible) || 0;

    output += "#### 1. Résumé de la Situation Financière\n";
    output += `- Chiffre d'Affaires : **${ca.toLocaleString()} DA**\n`;
    output += `- Résultat Brut estimé : **${res.toLocaleString()} DA**\n`;
    output += `- Trésorerie disponible : **${cash.toLocaleString()} DA**\n\n`;

    output += "#### 2. Recommandations de Gestion (Art. 150 CIDTA)\n";
    
    if (res > 0) {
      const reduction = Math.round(res * 0.05);
      output += `- **Levier IBS** : Le réinvestissement d'une partie des bénéfices dans des actifs productifs permet une réduction d'IBS de 5% à 10%. Impact potentiel : **-${reduction.toLocaleString()} DA**.\n`;
    }
    
    if (tva_c > tva_d) {
       output += `- **Optimisation TVA** : Votre TVA collectée dépasse la déductible. Vérifiez l'éligibilité à la déduction des factures de services extérieurs (Classe 61/62) pour optimiser votre prochaine G50.\n`;
    }

    if (cash < ca * 0.05) {
      output += `- **Alerte Trésorerie** : Votre niveau de liquidité est critique (< 5% du CA). Priorité absolue : Recouvrement des créances clients à +30 jours.\n`;
    } else {
      output += `- **Efficience Cash** : Trésorerie saine. Envisagez de négocier des remises pour paiement anticipé auprès de vos fournisseurs stratégiques.\n`;
    }
  } 
  else if (key === 'STOCK_EOQ_DECISION') {
    const D = Number(vars.D) || 0;
    const S = Number(vars.S) || 0;
    const H = Number(vars.H) || 0;
    
    if (D > 0 && S > 0 && H > 0) {
      const eoq = Math.round(Math.sqrt((2 * D * S) / H));
      output += `#### Analyse de Stock (Modèle de Wilson)\n`;
      output += `- Quantité économique de commande (EOQ) : **${eoq} unités**\n`;
      output += `- Fréquence optimale : **${Math.round(D / eoq)} commandes / an**\n`;
      output += `- Recommandation : Maintenir ce lot de commande pour équilibrer coût de possession et coût de passation.\n`;
    } else {
      output += "Données logistiques incomplètes pour générer un calcul EOQ précis.\n";
    }
  }
  else {
    output += "#### Recommandation de Pilotage Standard\n";
    output += "Sur la base de vos indicateurs actuels, le système recommande une revue de vos charges d'exploitation. Veuillez consulter le module 'Analyse & Pilotage' pour identifier les dérives par rapport à votre budget prévisionnel.\n";
  }

  output += "\n--- \n*Certification : Moteur de Recommandation ComptaFisc-DZ v2.6 (Audit Ready)*";
  return output;
}
