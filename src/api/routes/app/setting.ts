import { Router, Request, Response } from 'express';
import AppSetting from '../../../models/AppSetting';
import CMSPage from '../../../models/CMSPage';
import FAQ from '../../../models/FAQ';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  /**
   * @route GET /api/app/settings
   * @desc Get public app settings (platform fees, report reasons, location ranges, cms pages, faqs)
   * @access Public
   */
  router.get('/settings', async (req: Request, res: Response) => {
    try {
      const [settings, cmsPages, faqs] = await Promise.all([
        AppSetting.findOne(),
        CMSPage.find().select('title slug content'),
        FAQ.find({ isPublish: true }).sort({ sortOrder: 1, createdAt: -1 })
      ]);

      const termsPage = cmsPages.find(p => p.slug === 'terms-and-conditions');
      const aboutPage = cmsPages.find(p => p.slug === 'about-us');

      return ResponseWrapper.success(res, {
        platformFees: settings?.platformFees ?? 0,
        reportReasons: settings?.reportReasons ?? [],
        locationRanges: settings?.locationRanges ?? [
          { id: 'range_1', min: 0, max: 5, label: '0 to 5 km' },
          { id: 'range_2', min: 5, max: 10, label: '5 to 10 km' },
          { id: 'range_3', min: 10, max: 20, label: '10 to 20 km' },
          { id: 'range_4', min: 20, max: 50, label: '20 to 50 km' },
          { id: 'range_5', min: 50, max: 100, label: '50 to 100 km' },
          { id: 'range_6', min: 100, max: 500, label: '100+ km' }
        ],
        cmsPages: cmsPages,
        faqs: faqs,
        termsAndConditions: termsPage?.content ?? '',
        about: aboutPage?.content ?? ''
      }, 'App settings fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error);
    }
  });
};
