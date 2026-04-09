import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { SubscriptionService } from '../../../services/app/SubscriptionService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';

export default (router: Router) => {
  const subscriptionService = Container.get(SubscriptionService);

  /**
   * @route POST /api/app/payments/platform-fee
   * @desc Create Razorpay order for platform fee
   * @access Private
   */
  router.post(
    '/payments/platform-fee',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const result = await subscriptionService.createPlatformFeeOrder(userId);
        return ResponseWrapper.success(res, result, 'Platform fee order created');
      } catch (error: any) {
        return ResponseWrapper.error(res, error);
      }
    }
  );

  /**
   * @route POST /api/app/payments/platform-fee/verify
   * @desc Verify platform fee payment and update user status
   * @access Private
   */
  router.post(
    '/payments/platform-fee/verify',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const result = await subscriptionService.verifyPlatformFeePayment(userId, req.body);
        return ResponseWrapper.success(res, result, 'Platform fee payment verified');
      } catch (error: any) {
        return ResponseWrapper.error(res, error);
      }
    }
  );
};
