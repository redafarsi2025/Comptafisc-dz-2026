import { z } from 'zod';

export const stockSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  status: z.enum(['En stock', 'Stock faible', 'En rupture de stock']),
  supplier: z.string().optional(),
});

export type Stock = z.infer<typeof stockSchema>;
