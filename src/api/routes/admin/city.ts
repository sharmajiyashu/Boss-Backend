import { Router, Request, Response } from 'express';
import Container from "typedi";
import { CityService } from "../../../services/admin/CityService";
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const cityService = Container.get(CityService);

    router.get('/cities', async (req: Request, res: Response) => {
        try {
            const { page, limit, search, stateId, countryId, isActive } = req.query as any;
            if (page && limit) {
                const result = await cityService.getCities(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { countryId, stateId, search, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }
                );
                return ResponseWrapper.success(res, result, 'Cities fetched successfully');
            } else if (stateId) {
                const result = await cityService.getCitiesByState(stateId);
                return ResponseWrapper.success(res, result, 'Cities for state fetched successfully');
            } else {
                return ResponseWrapper.error(res, 'Pagination parameters or stateId are required', 400);
            }
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.post('/cities', async (req: Request, res: Response) => {
        try {
            const result = await cityService.createCity(req.body);
            return ResponseWrapper.success(res, result, 'City created successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.put('/cities/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await cityService.updateCity(id, req.body);
            if (!result) return ResponseWrapper.error(res, 'City not found', 404);
            return ResponseWrapper.success(res, result, 'City updated successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.delete('/cities/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await cityService.deleteCity(id);
            if (!result) return ResponseWrapper.error(res, 'City not found', 404);
            return ResponseWrapper.success(res, null, 'City deleted successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });
}
