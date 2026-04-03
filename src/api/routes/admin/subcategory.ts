import { Router, Request, Response } from 'express';
import Container from "typedi";
import { SubcategoryService } from "../../../services/admin/SubcategoryService";
import { CloudinaryService } from "../../../services/common/CloudinaryService";
import { MediaService } from "../../../services/common/MediaService";
import { ResponseWrapper } from '../../responseWrapper';
import { validate } from '../../validators';
import { createSubcategorySchema, getSubcategoryQuerySchema, updateSubcategorySchema } from '../../validators/subcategory';
import upload from '../../middleware/upload';
import { MediaType } from '../../../constants/enum';

export default (router: Router) => {
    const subcategoryService = Container.get(SubcategoryService);
    const cloudinaryService = Container.get(CloudinaryService);
    const mediaService = Container.get(MediaService);

    // GET /api/admin/subcategories - List with pagination
    router.get('/subcategories',
        async (req: Request, res: Response) => {
            try {
                const { page, limit, search, status, category } = req.query as any;
                const result = await subcategoryService.getSubcategories(
                    { page, limit },
                    { search, status, category }
                );
                return ResponseWrapper.success(res, result, 'Subcategories fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // POST /api/admin/subcategories - Create
    router.post('/subcategories',
        upload.single('media'),
        validate(createSubcategorySchema),
        async (req: Request, res: Response) => {
            try {
                if (req.file) {
                    const uploadResult = await cloudinaryService.uploadMedia(
                        MediaType.image,
                        [req.file],
                        'subcategories'
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

                const result = await subcategoryService.createSubcategory(req.body);
                return ResponseWrapper.success(res, result, 'Subcategory created successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // PUT /api/admin/subcategories/:id - Update
    router.put('/subcategories/:id',
        upload.single('media'),
        validate(updateSubcategorySchema),
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;

                if (req.file) {
                    const uploadResult = await cloudinaryService.uploadMedia(
                        MediaType.image,
                        [req.file],
                        'subcategories'
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

                const result = await subcategoryService.updateSubcategory(id, req.body);
                if (!result) return ResponseWrapper.error(res, 'Subcategory not found', 404);

                return ResponseWrapper.success(res, result, 'Subcategory updated successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // DELETE /api/admin/subcategories/:id - Delete
    router.delete('/subcategories/:id',
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const result = await subcategoryService.deleteSubcategory(id);
                if (!result) return ResponseWrapper.error(res, 'Subcategory not found', 404);

                return ResponseWrapper.success(res, null, 'Subcategory deleted successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });
}
