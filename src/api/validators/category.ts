import { z } from 'zod';

export const createCategorySchema = z.object({
    name: z.string().trim().min(3),
    media: z.string().optional(), // Expecting a Media ID as string
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const updateCategorySchema = z.object({
    name: z.string().trim().min(3).optional(),
    media: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const getCategoryQuerySchema = z.object({
    page: z.string().optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().optional().transform(v => parseInt(v || '10', 10)),
    search: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});
