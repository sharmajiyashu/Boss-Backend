import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { VerificationService } from '../../../services/app/VerificationService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { sendOtpBodySchema, verifyOtpBodySchema } from '../../validators/verification';

export default (router: Router) => {
  const verificationService = Container.get(VerificationService);

  /**
   * @route POST /api/app/verification/aadhaar/send-otp
   * @desc Send OTP for Aadhaar verification
   * @access Private
   */
  router.post(
    '/verification/aadhaar/send-otp',
    appAuthMiddleware,
    validate(sendOtpBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { aadhaar_number } = req.body;
        const result = await verificationService.sendOtp(userId, aadhaar_number);
        return ResponseWrapper.success(res, result, 'OTP sent successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  /**
   * @route POST /api/app/verification/aadhaar/verify-otp
   * @desc Verify OTP and update Aadhaar verification status
   * @access Private
   */
  router.post(
    '/verification/aadhaar/verify-otp',
    appAuthMiddleware,
    validate(verifyOtpBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { otp } = req.body;
        const result = await verificationService.verifyOtp(userId, otp);
        return ResponseWrapper.success(res, result, 'Aadhaar verification completed');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );
};
