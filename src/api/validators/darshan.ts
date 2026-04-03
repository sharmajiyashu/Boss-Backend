import { z } from 'zod';

const coerceNumber = z.coerce.number();

export const darshanValidationSchema = z.object({
  templeId: coerceNumber,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  shift: z.enum(['morning', 'evening']).default('morning'),
  descriptionEn: z.string().optional().nullable(),
  descriptionHi: z.string().optional().nullable(),
});

export const updateDarshanValidationSchema = darshanValidationSchema.partial();

export const getDarshansQuerySchema = z.object({
  page: coerceNumber.default(1),
  limit: coerceNumber.default(10),
  templeId: coerceNumber.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift: z.enum(['morning', 'evening']).optional(),
});
