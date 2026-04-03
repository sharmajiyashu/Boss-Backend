import { Router, Request, Response } from 'express';
import Container from "typedi";
import { AuthenticationService } from "../../../services/common/AuthenticationService";
import { ResponseWrapper } from '../../responseWrapper';
import { validate } from '../../validators';
import { sendOtpSchema, verifyOtpSchema, userLoginSchema, userRegisterSchema } from '../../validators/auth';

export default (router: Router) => {
    const authService = Container.get(AuthenticationService);

    // POST /api/app/auth/register - Register a new user
    router.post('/auth/register',
        validate(userRegisterSchema, 'body'),
        async (req: Request, res: Response) => {
            try {
                const result = await authService.userRegister(req.body);
                return ResponseWrapper.success(res, result, 'User registered successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
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
                return ResponseWrapper.error(res, error.message);
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
                return ResponseWrapper.error(res, error.message);
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
                return ResponseWrapper.error(res, error.message);
            }
        });
}
