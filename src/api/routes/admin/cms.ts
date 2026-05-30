import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { CMSService } from '../../../services/admin/CMSService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  const cmsService = Container.get(CMSService);

  // GET /api/admin/cms - Get all pages
  router.get('/cms', async (req: Request, res: Response) => {
    try {
      const pages = await cmsService.getPages();
      return ResponseWrapper.success(res, pages, 'CMS pages fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // GET /api/admin/cms/:slug - Get a page by slug
  router.get('/cms/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug as string;
      const page = await cmsService.getPageBySlug(slug);
      if (!page) return ResponseWrapper.error(res, 'CMS page not found', 404);
      return ResponseWrapper.success(res, page, 'CMS page details fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // PUT /api/admin/cms/:slug - Upsert dynamic page content
  router.put('/cms/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug as string;
      const { title, content } = req.body;
      if (!title) return ResponseWrapper.error(res, 'Title is required', 400);

      const page = await cmsService.upsertPage(slug, { title, content: content || "" });
      return ResponseWrapper.success(res, page, 'CMS page updated successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });
};
