import { Router, Request, Response } from 'express';
import FAQ from '../../../models/FAQ';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  // GET /api/admin/faqs - Get all FAQs
  router.get('/faqs', async (req: Request, res: Response) => {
    try {
      const faqs = await FAQ.find().sort({ sortOrder: 1, createdAt: -1 });
      return ResponseWrapper.success(res, faqs, 'FAQs fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // GET /api/admin/faqs/:id - Get FAQ by ID
  router.get('/faqs/:id', async (req: Request, res: Response) => {
    try {
      const faq = await FAQ.findById(req.params.id);
      if (!faq) return ResponseWrapper.error(res, 'FAQ not found', 404);
      return ResponseWrapper.success(res, faq, 'FAQ fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // POST /api/admin/faqs - Create FAQ
  router.post('/faqs', async (req: Request, res: Response) => {
    try {
      const { question, answer, isPublish, sortOrder } = req.body;
      if (!question || !answer) {
        return ResponseWrapper.error(res, 'Question and Answer are required', 400);
      }
      const faq = await FAQ.create({ question, answer, isPublish, sortOrder });
      return ResponseWrapper.success(res, faq, 'FAQ created successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // PUT /api/admin/faqs/:id - Update FAQ
  router.put('/faqs/:id', async (req: Request, res: Response) => {
    try {
      const { question, answer, isPublish, sortOrder } = req.body;
      const faq = await FAQ.findById(req.params.id);
      if (!faq) return ResponseWrapper.error(res, 'FAQ not found', 404);

      if (question !== undefined) faq.question = question;
      if (answer !== undefined) faq.answer = answer;
      if (isPublish !== undefined) faq.isPublish = isPublish;
      if (sortOrder !== undefined) faq.sortOrder = sortOrder;

      await faq.save();
      return ResponseWrapper.success(res, faq, 'FAQ updated successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // DELETE /api/admin/faqs/:id - Delete FAQ
  router.delete('/faqs/:id', async (req: Request, res: Response) => {
    try {
      const faq = await FAQ.findByIdAndDelete(req.params.id);
      if (!faq) return ResponseWrapper.error(res, 'FAQ not found', 404);
      return ResponseWrapper.success(res, null, 'FAQ deleted successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });
};
