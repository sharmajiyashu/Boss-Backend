import { z } from 'zod';

export const createProductSchema = z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID"),
    subcategory: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Subcategory ID").optional(),
    media: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Media ID")).min(1, "At least one image is required"),
    price: z.coerce.number().min(0, "Price must be at least 0"),
    stock: z.coerce.number().min(0, "Stock must be at least 0").optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).default('pending'),
});

export const updateProductSchema = z.object({
    name: z.string().trim().min(3).optional(),
    description: z.string().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    subcategory: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    media: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    price: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().min(0).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).optional(),
});

export const getProductQuerySchema = z.object({
    page: z.string().optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().optional().transform(v => parseInt(v || '10', 10)),
    search: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).optional(),
});
