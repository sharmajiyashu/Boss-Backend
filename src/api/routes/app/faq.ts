import { Router, Request, Response } from 'express';
import FAQ from '../../../models/FAQ';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  // GET /api/app/faqs - Get all published FAQs
  router.get('/faqs', async (req: Request, res: Response) => {
    try {
      const faqs = await FAQ.find({ isPublish: true }).sort({ sortOrder: 1, createdAt: -1 });
      return ResponseWrapper.success(res, faqs, 'FAQs fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error);
    }
  });
};
