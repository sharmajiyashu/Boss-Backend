import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { ProductService } from '../../../services/app/ProductService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { createProductSchema, updateProductSchema } from '../../validators/product';

export default (router: Router) => {
  const productService = Container.get(ProductService);

  // GET /api/products - Get all approved products with filters
  router.get('/products', async (req: Request, res: Response) => {
    try {
      const { categoryId, subcategoryId, search } = req.query as any;
      const products = await productService.getProducts({ categoryId, subcategoryId, search });
      return ResponseWrapper.success(res, products, 'Products fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // GET /api/my-products - Get products listed by current user
  router.get('/my-products', appAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const products = await productService.listSellerProducts(userId);
      return ResponseWrapper.success(res, products, 'Your products fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // GET /api/products/:id - Get product details
  router.get('/products/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const product = await productService.getProductById(id);
      if (!product) return ResponseWrapper.error(res, 'Product not found', 404);
      return ResponseWrapper.success(res, product, 'Product details fetched successfully');
    } catch (error: any) {
      return ResponseWrapper.error(res, error.message);
    }
  });

  // POST /api/products - Create a new product listing
  router.post('/products',
    appAuthMiddleware,
    validate(createProductSchema, 'body'),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const product = await productService.createProduct(userId, req.body);
        return ResponseWrapper.success(res, product, 'Product listing created successfully and is pending approval', 201);
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // PATCH /api/products/:id/status - Update product status (e.g., mark as sold)
  router.patch('/products/:id/status',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const productId = req.params.id as string;
        const { status } = req.body;
        const isAdmin = !!(req as any).user.adminRoleId;

        if (!isAdmin && !['sold', 'inactive'].includes(status)) {
          return ResponseWrapper.error(res, 'Invalid status update. Sellers can only mark as sold or inactive.');
        }

        // Verify ownership/permission
        const product = await productService.getProductById(productId);
        if (!product) return ResponseWrapper.error(res, 'Product not found', 404);

        if (!isAdmin && product.seller.toString() !== userId) {
          return ResponseWrapper.error(res, 'Unauthorized to update this product', 403);
        }

        const updatedProduct = await productService.updateProductStatus(productId, status as 'pending' | 'approved' | 'rejected' | 'sold' | 'inactive');
        return ResponseWrapper.success(res, updatedProduct, `Product status updated to ${status}`);
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );
};

