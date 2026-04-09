import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { UserService } from '../../../services/app/UserService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { fcmTokenBodySchema, removeFcmTokenBodySchema } from '../../validators/chat';

export default (router: Router) => {
  const userService = Container.get(UserService);

  // GET /api/app/user/profile - Get current user profile
  router.get('/user/profile',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const user = await userService.getProfile(userId);
        return ResponseWrapper.success(res, user, 'Profile fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/app/user/profile - Update current user profile
  router.patch('/user/profile',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const updatedUser = await userService.updateProfile(userId, req.body);
        return ResponseWrapper.success(res, updatedUser, 'Profile updated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.post(
    '/user/fcm-token',
    appAuthMiddleware,
    validate(fcmTokenBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { token, deviceType } = req.body;
        const result = await userService.registerFcmToken(userId, token, deviceType);
        return ResponseWrapper.success(res, result, 'FCM token registered');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  router.delete(
    '/user/fcm-token',
    appAuthMiddleware,
    validate(removeFcmTokenBodySchema),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { token } = req.body;
        const result = await userService.removeFcmToken(userId, token);
        return ResponseWrapper.success(res, result, 'FCM token removed');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );
};
