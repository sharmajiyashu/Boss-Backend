import { z } from 'zod';

export const locationSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  label: z.string().optional(),
});

export const updateLocationSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID').optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  label: z.string().optional(),
  saveToAddresses: z.boolean().optional(),
}).refine(
  (data) => data.addressId || (data.lat !== undefined && data.lng !== undefined),
  { message: 'Provide addressId or both lat and lng' }
);

export const createAddressSchema = locationSchema.extend({
  label: z.string().trim().min(1, 'Label is required'),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = z.object({
  label: z.string().trim().min(1).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const addressIdParamSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'),
});
