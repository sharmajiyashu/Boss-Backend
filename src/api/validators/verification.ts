import { z } from 'zod';

export const sendOtpBodySchema = z.object({
  aadhaar_number: z.string().length(12, 'Aadhaar number must be 12 digits'),
});

export const verifyOtpBodySchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});
