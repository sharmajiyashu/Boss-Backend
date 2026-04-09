import { z } from 'zod';

export const sendOtpSchema = z.object({
    extension: z.string().regex(/^\d{1,4}$/, "Invalid extension (e.g. 91)"),
    mobile: z.string().length(10, "Mobile number must be 10 digits").regex(/^\d+$/, "Mobile number must contain only digits"),
});

export const verifyOtpSchema = z.object({
    extension: z.string().regex(/^\d{1,4}$/, "Invalid extension (e.g. 91)"),
    mobile: z.string().length(10, "Mobile number must be 10 digits").regex(/^\d+$/, "Mobile number must contain only digits"),
    otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must contain only digits"),
});

export const adminLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userRegisterSchema = z.object({
    firstName: z.string().min(2, "First name too short"),
    lastName: z.string().min(2, "Last name too short"),
    email: z.string().email("Invalid email address"),
    mobile: z.string().length(10, "Mobile number must be 10 digits").regex(/^\d+$/, "Mobile number must contain only digits"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    location: z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipcode: z.string().optional(),
    }).optional(),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const verifyEmailSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
