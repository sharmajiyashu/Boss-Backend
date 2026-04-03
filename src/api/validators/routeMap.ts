import { z } from 'zod';

const coerceNumber = z.coerce.number();
const coerceBoolean = z.coerce.boolean();

export const routeMapValidationSchema = z.object({
  nameEn: z.string().min(1, 'Name in English is required'),
  nameHi: z.string().min(1, 'Name in Hindi is required'),
  
  totalDistanceEn: z.string().optional().nullable(),
  totalDistanceHi: z.string().optional().nullable(),
  
  approxTimeEn: z.string().optional().nullable(),
  approxTimeHi: z.string().optional().nullable(),
  
  recommendationEn: z.string().optional().nullable(),
  recommendationHi: z.string().optional().nullable(),
  
  isActive: coerceBoolean.default(true),
  
  temples: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.object({
    templeId: coerceNumber,
    sortOrder: coerceNumber.default(0),
    distanceFromPreviousEn: z.string().optional().nullable(),
    distanceFromPreviousHi: z.string().optional().nullable(),
    timeFromPreviousEn: z.string().optional().nullable(),
    timeFromPreviousHi: z.string().optional().nullable(),
  }))).default([]),
});

export const updateRouteMapValidationSchema = routeMapValidationSchema.partial();
