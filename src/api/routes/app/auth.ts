import { Router, Request, Response } from 'express';
import Container from "typedi";
import { AuthenticationService } from "../../../services/common/AuthenticationService";
import { ResponseWrapper } from '../../responseWrapper';
import { validate } from '../../validators';
import { sendOtpSchema, verifyOtpSchema, userLoginSchema, userRegisterSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from '../../validators/auth';

export default (router: Router) => {
    const authService = Container.get(AuthenticationService);

    // POST /api/app/auth/register - Register a new user
    router.post('/auth/register',
        validate(userRegisterSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const result = await authService.userRegister(req.body);
                return ResponseWrapper.success(res, result, 'User registered. Please verify your email.');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // POST /api/app/auth/verify-email - Verify email using OTP
    router.post('/auth/verify-email',
        validate(verifyEmailSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const { email, otp } = req.body;
                const result = await authService.userVerifyEmail(email, otp);
                return ResponseWrapper.success(res, result, 'Email verified successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // POST /api/app/auth/login - User login with email/password
    router.post('/auth/login',
        validate(userLoginSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const { email, password } = req.body;
                const result = await authService.userLogin(email, password);
                return ResponseWrapper.success(res, result, 'User logged in successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    router.post('/auth/send-otp',
        validate(sendOtpSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const { extension, mobile } = req.body;
                const fullMobile = `${extension}${mobile}`;
                await authService.userSendOTP(fullMobile);
                return ResponseWrapper.success(res, null, 'OTP sent successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    router.post('/auth/verify-otp',
        validate(verifyOtpSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const { extension, mobile, otp } = req.body;
                const fullMobile = `${extension}${mobile}`;
                const result = await authService.userVerifyOTP(fullMobile, otp);
                return ResponseWrapper.success(res, result, 'OTP verified successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // POST /api/app/auth/forgot-password - Request password reset OTP
    router.post('/auth/forgot-password',
        validate(forgotPasswordSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const { email } = req.body;
                await authService.userForgotPassword(email);
                return ResponseWrapper.success(res, null, 'Reset OTP sent to your email');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });

    // POST /api/app/auth/reset-password - Reset password using OTP
    router.post('/auth/reset-password',
        validate(resetPasswordSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                await authService.userResetPassword(req.body);
                return ResponseWrapper.success(res, null, 'Password reset successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error);
            }
        });
}
