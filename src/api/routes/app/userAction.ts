import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { UserActionService } from '../../../services/app/UserActionService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';

export default (router: Router) => {
  const userActionService = Container.get(UserActionService);

  router.post('/user-actions/report',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const report = await userActionService.reportUser(userId, req.body);
        return ResponseWrapper.success(res, report, 'Report submitted successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.post('/user-actions/block',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const { targetUserId } = req.body;
        await userActionService.blockUser(userId, targetUserId);
        return ResponseWrapper.success(res, null, 'User blocked successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.post('/user-actions/unblock',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const { targetUserId } = req.body;
        await userActionService.unblockUser(userId, targetUserId);
        return ResponseWrapper.success(res, null, 'User unblocked successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
