import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createDirectChatSchema = z.object({
    participantId: objectId,
});

export const chatListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const chatMessagesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const sendChatMessageSchema = z
    .object({
        text: z.string().trim().max(5000).optional(),
        mediaIds: z.array(objectId).max(10).optional(),
    })
    .refine((d) => (d.text && d.text.length > 0) || (d.mediaIds && d.mediaIds.length > 0), {
        message: 'Provide text and/or mediaIds',
    });

export const fcmTokenBodySchema = z.object({
    token: z.string().min(1).max(4096),
    deviceType: z.enum(['android', 'ios', 'web']).optional(),
});

export const removeFcmTokenBodySchema = z.object({
    token: z.string().min(1).max(4096),
});
