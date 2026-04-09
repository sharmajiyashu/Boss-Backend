import { Router, Request, Response } from 'express';
import AppSetting from '../../../models/AppSetting';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  /**
   * @route GET /api/app/settings
   * @desc Get public app settings (platform fees, report reasons)
   * @access Public
   */
  router.get('/settings', async (req: Request, res: Response) => {
    try {
      const settings = await AppSetting.findOne().select('platformFees reportReasons');
      return ResponseWrapper.success(res, settings, 'App settings fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error);
    }
  });
};
