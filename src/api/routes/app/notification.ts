import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { NotificationService } from '../../../services/common/NotificationService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';

export default (router: Router) => {
  const notificationService = Container.get(NotificationService);

  // GET /api/app/notifications - Get paginated user notifications
  router.get('/notifications',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '10');

        const result = await notificationService.getNotifications(userId, 'user', page, limit);
        return ResponseWrapper.success(res, result, 'Notifications fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/app/notifications/:id/read - Mark notification as read
  router.patch('/notifications/:id/read',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const notificationId = req.params.id as string;

        const success = await notificationService.markAsRead(notificationId, userId, 'user');
        if (!success) {
          return ResponseWrapper.error(res, 'Notification not found or unauthorized', 404);
        }

        return ResponseWrapper.success(res, { success: true }, 'Notification marked as read');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
