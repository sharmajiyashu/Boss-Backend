import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { ProductService } from '../../../services/app/ProductService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
  const productService = Container.get(ProductService);

  // GET /api/products - Get all products with filters
  router.get('/products', async (req: Request, res: Response) => {
    try {
      const { categoryId, subcategoryId, search } = req.query as any;
      const products = await productService.getProducts({ categoryId, subcategoryId, search });
      return ResponseWrapper.success(res, products, 'Products fetched successfully');
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
};
