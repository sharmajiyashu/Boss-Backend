import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { SubcategoryService } from '../../../services/admin/SubcategoryService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  const subcategoryService = Container.get(SubcategoryService);

  // POST /api/subcategories - Create subcategory with category id
  router.post('/subcategories', async (req: Request, res: Response) => {
    try {
      const { name, categoryId, description } = req.body;
      if (!name || !categoryId) {
        return ResponseWrapper.error(res, 'Name and categoryId are required', 400);
      }

      const result = await subcategoryService.createSubcategory({
        name,
        category: categoryId,
        description,
        status: 'active'
      } as any);

      return ResponseWrapper.success(res, result, 'Subcategory created successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // GET /api/categories/:categoryId/subcategories - Get all subcategories for a category
  router.get('/categories/:categoryId/subcategories', async (req: Request, res: Response) => {
    try {
      const categoryId = req.params.categoryId as string;
      const result = await subcategoryService.getSubcategories(
        { page: 1, limit: 100 },
        { category: categoryId, status: 'active' },
        { includeProductCount: true }
      );
      return ResponseWrapper.success(res, result.data, 'Subcategories fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });
};
