import { z } from 'zod';

export const assetSchema = z.object({
  id: z.string(),
  acquisitionDate: z.string(),
  name: z.string(),
  value: z.number(),
  status: z.enum(['En service', 'Amorti', 'Cédé']),
  amortization: z.object({
    method: z.enum(['Linéaire', 'Dégressif']),
    duration: z.number(),
  }),
});

export type Asset = z.infer<typeof assetSchema>;
