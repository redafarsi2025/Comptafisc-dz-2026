
import { z } from 'zod';

export const PublicationCategorySchema = z.enum([
  'loi_finances',
  'loi_finances_comp',
  'circulaire',
  'instruction',
  'code_fiscal',
  'communique_lf',
  'communique_special',
  'communique_declaration',
  'guide',
  'actualite',
  'autre',
]);

export type PublicationCategory = z.infer<typeof PublicationCategorySchema>;

export const ImpactLevelSchema = z.enum([
  'critique',
  'important',
  'informatif',
  'aucun',
]);

export type ImpactLevel = z.infer<typeof ImpactLevelSchema>;

export interface DgiPublication {
  id: string;
  url: string;
  title: string;
  category: PublicationCategory;
  publishedDate: string;
  detectedAt: string;
  bodyText?: string;
  pdfUrl?: string;
  impactLevel: ImpactLevel;
  summary?: string;
  keyPoints?: string[];
  affectedSaasModules?: string[];
  extractedData?: any;
}

export interface DgiAlert {
  id: string;
  publicationId: string;
  detectedAt: string;
  changeType: string;
  description: string;
  impactLevel: ImpactLevel;
  affectedVariable?: string;
  oldValue?: any;
  newValue?: any;
  isValidated: boolean;
}
