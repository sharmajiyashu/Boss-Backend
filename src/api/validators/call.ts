import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const scheduleCallSchema = z.object({
  receiverId: objectId,
  scheduledTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export const updateCallStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'ongoing', 'completed', 'missed', 'declined']),
});

export const saveCallHistorySchema = z.object({
  receiverId: objectId,
  scheduledCallId: objectId.optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['completed', 'missed', 'declined']),
});
