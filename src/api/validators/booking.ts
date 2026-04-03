import { z } from 'zod';

const coerceNumber = z.coerce.number();

export const bookingContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  email: z.string().email('Invalid email').optional().nullable(),
});

export const createBookingValidationSchema = z.object({
  tourId: coerceNumber,
  bookingDate: z.string(), // "YYYY-MM-DD"
  slot: z.string().min(1, 'Slot is required'),
  personCount: coerceNumber.min(1).default(1),

  // Pricing & Coupon
  basePrice: coerceNumber.min(0),
  discountAmount: coerceNumber.min(0).default(0),
  totalPrice: coerceNumber.min(0),
  couponCode: z.string().optional().nullable(),

  // Contacts
  contacts: z.array(bookingContactSchema).min(1, 'At least one contact is required'),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['upcoming', 'completed', 'cancelled']),
  cancellationReason: z.string().optional().nullable(),
});
