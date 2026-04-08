import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { AppSettingService } from '../../../services/admin/AppSettingService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  const settingService = Container.get(AppSettingService);

  router.get('/admin/settings',
    async (req: Request, res: Response) => {
      try {
        const settings = await settingService.getSettings();
        return ResponseWrapper.success(res, settings, 'Settings fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  router.patch('/admin/settings',
    async (req: Request, res: Response) => {
      try {
        const settings = await settingService.updateSettings(req.body);
        return ResponseWrapper.success(res, settings, 'Settings updated successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
