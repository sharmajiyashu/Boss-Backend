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
      const settings = await AppSetting.findOne();
      // Return only platform fees and report reasons, hide other admin-only fields
      return ResponseWrapper.success(res, {
        platformFees: settings?.platformFees,
        reportReasons: settings?.reportReasons,
      }, 'App settings fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error);
    }
  });
};
