import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { SubscriptionService } from '../../../services/app/SubscriptionService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';

export default (router: Router) => {
  const subscriptionService = Container.get(SubscriptionService);

  router.get('/subscriptions/plans', async (req: Request, res: Response) => {
    try {
      const plans = await subscriptionService.getActivePlans();
      return ResponseWrapper.success(res, plans, 'Plans fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  router.post('/subscriptions/purchase',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const { planId } = req.body;
        const order = await subscriptionService.createOrder(planId, userId);
        return ResponseWrapper.success(res, order, 'Order created successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.post('/subscriptions/verify',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const subscription = await subscriptionService.verifyAndActivateSubscription(userId, req.body);
        return ResponseWrapper.success(res, subscription, 'Subscription activated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
