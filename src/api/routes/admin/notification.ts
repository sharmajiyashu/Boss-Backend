import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { NotificationService } from '../../../services/common/NotificationService';
import { ResponseWrapper } from '../../responseWrapper';
import { adminAuthMiddleware } from '../../middleware/adminAuthMiddleware';

export default (router: Router) => {
  const notificationService = Container.get(NotificationService);

  // GET /api/admin/notifications - Get paginated admin notifications
  router.get('/notifications',
    adminAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user.id;
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '10');

        const result = await notificationService.getNotifications(adminId, 'admin', page, limit);
        return ResponseWrapper.success(res, result, 'Admin notifications fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // POST /api/admin/notifications/send-all - Broadcast notification to all users
  router.post('/notifications/send-all',
    adminAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user.id;
        const { title, message } = req.body;

        if (!title || !message) {
          return ResponseWrapper.error(res, 'Title and message are required', 400);
        }

        const notification = await notificationService.createNotification({
          title,
          message,
          recipient: 'all',
          sender: adminId,
          type: 'broadcast'
        });

        return ResponseWrapper.success(res, notification, 'Broadcast notification sent successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/admin/notifications/:id/read - Mark admin notification as read
  router.patch('/notifications/:id/read',
    adminAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const adminId = (req as any).user.id;
        const notificationId = req.params.id as string;

        const success = await notificationService.markAsRead(notificationId, adminId, 'admin');
        if (!success) {
          return ResponseWrapper.error(res, 'Notification not found or unauthorized', 404);
        }

        return ResponseWrapper.success(res, { success: true }, 'Notification marked as read');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
