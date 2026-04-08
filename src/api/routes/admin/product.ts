import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { AdminProductService } from '../../../services/admin/AdminProductService';
import { ResponseWrapper } from '../../responseWrapper';
import { adminAuthMiddleware } from '../../middleware/adminAuthMiddleware';
import { validate } from '../../validators';
import { getProductQuerySchema } from '../../validators/product';

export default (router: Router) => {
  const adminProductService = Container.get(AdminProductService);

  // GET /api/admin/products - Get all products (all statuses) with filters and pagination
  router.get('/admin/products',
    adminAuthMiddleware,
    validate(getProductQuerySchema, 'query'),
    async (req: Request, res: Response) => {
      try {
        const filters = req.query as any;
        const result = await adminProductService.listAllProducts(filters);
        return ResponseWrapper.success(res, result, 'All products fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/admin/products/:id/approve - Approve a product
  router.patch('/admin/products/:id/approve',
    adminAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const productId = req.params.id as string;
        const updatedProduct = await adminProductService.approveProduct(productId);
        if (!updatedProduct) return ResponseWrapper.error(res, 'Product not found', 404);
        return ResponseWrapper.success(res, updatedProduct, 'Product approved successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // PATCH /api/admin/products/:id/reject - Reject a product
  router.patch('/admin/products/:id/reject',
    adminAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const productId = req.params.id as string;
        const updatedProduct = await adminProductService.rejectProduct(productId);
        if (!updatedProduct) return ResponseWrapper.error(res, 'Product not found', 404);
        return ResponseWrapper.success(res, updatedProduct, 'Product rejected successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });
};
