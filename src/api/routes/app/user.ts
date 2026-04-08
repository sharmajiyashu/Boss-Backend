import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { UserService } from '../../../services/app/UserService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';

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
};
