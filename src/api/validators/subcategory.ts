import { z } from 'zod';

const fieldDefinitionSchema = z.object({
    label: z.string().trim().min(3),
    key: z.string().trim().min(3),
    fieldType: z.enum(['text', 'number', 'boolean', 'date', 'select', 'textarea', 'checkbox', 'switch']),
    options: z.array(z.string()).optional(),
    isFilterable: z.union([z.boolean(), z.string()]).transform(v => v === true || v === 'true').default(false),
    isRequired: z.union([z.boolean(), z.string()]).transform(v => v === true || v === 'true').default(false),
});

export const createSubcategorySchema = z.object({
    name: z.string().trim().min(3),
    category: z.string(), // Category ID
    media: z.string().optional(), // Media ID
    description: z.string().optional(),
    customFieldDefinitions: z.array(fieldDefinitionSchema).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const updateSubcategorySchema = z.object({
    name: z.string().trim().min(3).optional(),
    category: z.string().optional(),
    media: z.string().optional(),
    description: z.string().optional(),
    customFieldDefinitions: z.array(fieldDefinitionSchema).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const getSubcategoryQuerySchema = z.object({
    page: z.string().optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().optional().transform(v => parseInt(v || '10', 10)),
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});
