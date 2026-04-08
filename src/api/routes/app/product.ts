import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { ProductService } from '../../../services/app/ProductService';
import Product from '../../../models/Product';
import { CloudinaryService } from '../../../services/common/CloudinaryService';
import { MediaService } from '../../../services/common/MediaService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { createProductSchema, updateProductSchema, getProductQuerySchema } from '../../validators/product';
import upload from '../../middleware/upload';
import { MediaType } from '../../../constants/enum';

export default (router: Router) => {
  const productService = Container.get(ProductService);
  const cloudinaryService = Container.get(CloudinaryService);
  const mediaService = Container.get(MediaService);

  // GET /api/products - Get all approved products with filters and pagination
  router.get('/products',
    validate(getProductQuerySchema, 'query'),
    async (req: Request, res: Response) => {
      try {
        const filters = req.query as any;
        const result = await productService.getProducts(filters);
        return ResponseWrapper.success(res, result, 'Products fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    });

  // GET /api/my-products - Get products listed by current user with filters and pagination
  router.get('/my-products',
    appAuthMiddleware,
    validate(getProductQuerySchema, 'query'),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const filters = req.query as any;
        const result = await productService.listSellerProducts(userId, filters);
        return ResponseWrapper.success(res, result, 'Your products fetched successfully');
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

  // POST /api/products/upload - Upload images and return their media IDs
  router.post(
    '/products/upload',
    appAuthMiddleware,
    upload.array('media', 10), // ✅ multiple files with same key
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];

        // ✅ check files
        if (!files || files.length === 0) {
          return ResponseWrapper.error(res, 'No images uploaded');
        }

        // ✅ upload to cloudinary
        const uploadResults = await cloudinaryService.uploadMedia(
          MediaType.image,
          files,
          'products'
        );

        // ✅ save media
        const mediaPromises = uploadResults.map(result =>
          mediaService.createMedia({
            url: result.url,
            mimetype: result.mimetype,
            type: MediaType.image,
            size: result.size,
            width: result.width,
            height: result.height
          })
        );

        const mediaDocs = await Promise.all(mediaPromises);
        const mediaIds = mediaDocs.map(doc => doc._id.toString());

        return ResponseWrapper.success(
          res,
          { mediaIds },
          'Images uploaded successfully'
        );
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // POST /api/products - Create a new product listing (takes media IDs)
  router.post('/products',
    appAuthMiddleware,
    validate(createProductSchema, 'body'),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const product = await productService.createProduct(userId, req.body);
        return ResponseWrapper.success(res, product, 'Product listing created successfully', 201);
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // POST /api/products/:id/images - Add existing images (IDs) to product
  router.post('/products/:id/images',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const productId = req.params.id as string;
        const { mediaIds } = req.body;

        if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
          return ResponseWrapper.error(res, 'No media IDs provided');
        }

        const product = await productService.getProductById(productId);
        if (!product) return ResponseWrapper.error(res, 'Product not found', 404);
        if (product.seller._id.toString() !== userId) return ResponseWrapper.error(res, 'Unauthorized', 403);

        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $push: { media: { $each: mediaIds } } },
          { new: true }
        ).populate('media');

        return ResponseWrapper.success(res, updatedProduct, 'Images added to product successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // DELETE /api/products/:id/images/:mediaId - Delete product image
  router.delete('/products/:id/images/:mediaId',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const productId = req.params.id as string;
        const mediaId = req.params.mediaId as string;

        const product = await productService.getProductById(productId);
        if (!product) return ResponseWrapper.error(res, 'Product not found', 404);
        if (product.seller._id.toString() !== userId) return ResponseWrapper.error(res, 'Unauthorized', 403);

        await Product.findByIdAndUpdate(productId, {
          $pull: { media: mediaId }
        });

        return ResponseWrapper.success(res, null, 'Image removed from product');
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

