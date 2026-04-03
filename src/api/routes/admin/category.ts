import { Router, Request, Response } from 'express';
import Container from "typedi";
import { CategoryService } from "../../../services/admin/CategoryService";
import { CloudinaryService } from "../../../services/common/CloudinaryService";
import { MediaService } from "../../../services/common/MediaService";
import { ResponseWrapper } from '../../responseWrapper';
import { validate } from '../../validators';
import { createCategorySchema, getCategoryQuerySchema, updateCategorySchema } from '../../validators/category';
import upload from '../../middleware/upload';
import { MediaType } from '../../../constants/enum';

export default (router: Router) => {
    const categoryService = Container.get(CategoryService);
    const cloudinaryService = Container.get(CloudinaryService);
    const mediaService = Container.get(MediaService);

    // GET /api/admin/categories - Get paginated categories with media
    router.get('/categories',
        async (req: Request, res: Response) => {
            try {
                const { page, limit, search, status } = req.query as any;
                const result = await categoryService.getCategories(
                    { page, limit },
                    { search, status }
                );
                return ResponseWrapper.success(res, result, 'Categories fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // POST /api/admin/categories - Create a new category with optional media upload
    router.post('/categories',
        upload.single('media'),
        validate(createCategorySchema),
        async (req: Request, res: Response) => {
            try {
                if (req.file) {
                    const uploadResult = await cloudinaryService.uploadMedia(
                        MediaType.image,
                        [req.file],
                        'categories'
                    );

                    const media = await mediaService.createMedia({
                        url: uploadResult[0].url,
                        mimetype: uploadResult[0].mimetype,
                        type: MediaType.image,
                        size: uploadResult[0].size,
                        width: uploadResult[0].width,
                        height: uploadResult[0].height
                    });
                    req.body.media = media._id;
                }

                const result = await categoryService.createCategory(req.body);
                return ResponseWrapper.success(res, result, 'Category created successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // PUT /api/admin/categories/:id - Update an existing category
    router.put('/categories/:id',
        upload.single('media'),
        validate(updateCategorySchema),
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;

                if (req.file) {
                    // Upload new media
                    const uploadResult = await cloudinaryService.uploadMedia(
                        MediaType.image,
                        [req.file],
                        'categories'
                    );

                    const media = await mediaService.createMedia({
                        url: uploadResult[0].url,
                        mimetype: uploadResult[0].mimetype,
                        type: MediaType.image,
                        size: uploadResult[0].size,
                        width: uploadResult[0].width,
                        height: uploadResult[0].height
                    });
                    req.body.media = media._id;

                    // Optionally: Delete old media from Cloudinary if needed
                }

                const result = await categoryService.updateCategory(id, req.body);
                if (!result) return ResponseWrapper.error(res, 'Category not found', 404);

                return ResponseWrapper.success(res, result, 'Category updated successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // DELETE /api/admin/categories/:id - Delete a category
    router.delete('/categories/:id',
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const result = await categoryService.deleteCategory(id);
                if (!result) return ResponseWrapper.error(res, 'Category not found', 404);

                return ResponseWrapper.success(res, null, 'Category deleted successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });
}
