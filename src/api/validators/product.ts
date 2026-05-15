import { z } from 'zod';

export const createProductSchema = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Product ID").optional(),
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID"),
    subcategory: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Subcategory ID").optional(),
    media: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Media ID")).min(1, "At least one image is required"),
    price: z.coerce.number().min(0, "Price must be at least 0"),
    customFields: z.record(z.string(), z.any()).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).default('pending'),
    location: z.object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipcode: z.string().optional(),
    }).optional(),
});

export const updateProductSchema = z.object({
    name: z.string().trim().min(3).optional(),
    description: z.string().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    subcategory: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    media: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    price: z.coerce.number().min(0).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).optional(),
    location: z.object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipcode: z.string().optional(),
    }).optional(),
});

export const getProductQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID").optional(),
    subcategoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Subcategory ID").optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'sold', 'inactive']).optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radius: z.coerce.number().optional(),
}).passthrough();
