
/**
 * @fileoverview Modèles de données pour la gestion des contacts (fournisseurs, clients, etc.).
 * @version 1.0.0
 */

/**
 * Représente une entité contact dans le système.
 * Collection: `contacts`
 */
export interface Contact {
  id: string; // UUID
  tenantId: string;
  
  /**
   * Le nom ou la raison sociale du contact.
   */
  name: string; 
  
  /**
   * Type de contact pour le filtrage.
   */
  type: 'supplier' | 'client' | 'other';
  
  /**
   * Identifiants légaux.
   */
  nif?: string; // Numéro d'Identification Fiscale
  rc?: string;  // Registre de Commerce
  nis?: string; // Numéro d'Identification Statistique
  art?: string; // Numéro d'article d'imposition

  /**
   * Coordonnées.
   */
  address?: string;
  city?: string;
  phone?: string;
  email?: string;

  createdAt: string;
  updatedAt: string;
}
