import { Router, Request, Response } from 'express';
import Container from "typedi";
import { CountryService } from "../../../services/admin/CountryService";
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const countryService = Container.get(CountryService);

    router.get('/countries', async (req: Request, res: Response) => {
        try {
            const { page, limit, search, isActive } = req.query as any;
            if (page && limit) {
                const result = await countryService.getCountries(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { search, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }
                );
                return ResponseWrapper.success(res, result, 'Countries fetched successfully');
            } else {
                const result = await countryService.getAllCountries();
                return ResponseWrapper.success(res, result, 'All countries fetched successfully');
            }
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.post('/countries', async (req: Request, res: Response) => {
        try {
            const result = await countryService.createCountry(req.body);
            return ResponseWrapper.success(res, result, 'Country created successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.put('/countries/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await countryService.updateCountry(id, req.body);
            if (!result) return ResponseWrapper.error(res, 'Country not found', 404);
            return ResponseWrapper.success(res, result, 'Country updated successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.delete('/countries/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await countryService.deleteCountry(id);
            if (!result) return ResponseWrapper.error(res, 'Country not found', 404);
            return ResponseWrapper.success(res, null, 'Country deleted successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });
}
