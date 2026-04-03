import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { HomeService } from '../../../services/app/HomeService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  const homeService = Container.get(HomeService);

  // GET /api/home - Fetch categories and user profiles
  router.get('/home', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id; // If logged in
      const result = await homeService.getHomeData(userId);
      return ResponseWrapper.success(res, result, 'Home data fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });
};
