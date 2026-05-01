
/**
 * @fileoverview Moteur de règles pour l'évaluation des événements budgétaires.
 * @description Ce service charge, filtre et évalue les règles pour un événement donné.
 */

import { Firestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { BudgetRule, BudgetEventType } from '@/models/rules.models';

/**
 * Représente le résultat de l'évaluation des règles.
 */
export interface RuleEvaluationResult {
  actions: any; // Les actions à entreprendre, fusionnées depuis les règles correspondantes
  triggeredRules: BudgetRule[]; // La liste des règles qui ont été déclenchées
}

/**
 * Évalue un payload par rapport aux règles budgétaires actives pour un événement donné.
 *
 * @param db - L'instance de Firestore.
 * @param tenantId - L'ID du tenant.
 * @param eventType - Le type d'événement à évaluer (ex: 'purchase_request').
 * @param payload - L'objet de données à évaluer (ex: la demande d'achat).
 * @returns Le résultat de l'évaluation contenant les actions à exécuter.
 */
export async function evaluateRules(
  db: Firestore,
  tenantId: string,
  eventType: BudgetEventType,
  payload: any
): Promise<RuleEvaluationResult> {

  // 1. Charger les règles actives pour le tenant et l'événement, par priorité
  const rulesQuery = query(
    collection(db, 'budget_rules'),
    where('tenantId', '==', tenantId),
    where('eventType', '==', eventType),
    where('isActive', '==', true),
    orderBy('priority', 'asc')
  );

  const querySnapshot = await getDocs(rulesQuery);
  const rules = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetRule));

  const result: RuleEvaluationResult = {
    actions: {},
    triggeredRules: [],
  };

  if (rules.length === 0) {
    return result; // Aucune règle à évaluer
  }

  // 2. Évaluer chaque règle séquentiellement
  for (const rule of rules) {
    const conditions = rule.conditions;
    let ruleMatches = true;

    // 3. Évaluer les conditions de la règle
    for (const field in conditions) {
      const ruleCondition = conditions[field];
      const payloadValue = payload[field];

      for (const operator in ruleCondition) {
        const ruleValue = ruleCondition[operator];
        if (!evaluateCondition(payloadValue, operator, ruleValue)) {
          ruleMatches = false;
          break;
        }
      }
      if (!ruleMatches) break;
    }

    // 4. Si la règle correspond, ajouter ses actions au résultat
    if (ruleMatches) {
        // TODO: Implémenter une stratégie de fusion plus intelligente si nécessaire
        Object.assign(result.actions, rule.actions);
        result.triggeredRules.push(rule);
        // Pour l'instant, on s'arrête à la première règle qui matche.
        // On pourrait vouloir continuer et fusionner les actions.
        break;
    }
  }

  return result;
}

/**
 * Fonction utilitaire pour évaluer une seule condition.
 * @param value - La valeur du payload (ex: 15000).
 * @param operator - L'opérateur (ex: '>').
 * @param ruleValue - La valeur de la règle (ex: 10000).
 * @returns boolean
 */
function evaluateCondition(value: any, operator: string, ruleValue: any): boolean {
    switch (operator) {
      case '>': return value > ruleValue;
      case '<': return value < ruleValue;
      case '>=': return value >= ruleValue;
      case '<=': return value <= ruleValue;
      case '==': return value === ruleValue;
      case '!=': return value !== ruleValue;
      case 'in': return ruleValue.includes(value);
      // Ajouter d'autres opérateurs au besoin (ex: 'contains', 'startsWith', etc.)
      default: return false;
    }
}
