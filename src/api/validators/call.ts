import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const callStatusEnum = z.enum([
  'pending',
  'accepted',
  'rejected',
  'cancelled',
  'ongoing',
  'completed',
  'missed',
  'declined',
]);

export const scheduleCallSchema = z.object({
  receiverId: objectId,
  scheduledTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  productId: objectId.optional(),
});

export const updateCallStatusSchema = z.object({
  status: callStatusEnum,
});

export const respondCallMessageSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled', 'ongoing', 'completed', 'missed', 'declined']),
});

export const saveCallHistorySchema = z.object({
  receiverId: objectId,
  scheduledCallId: objectId.optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['completed', 'missed', 'declined']),
});
