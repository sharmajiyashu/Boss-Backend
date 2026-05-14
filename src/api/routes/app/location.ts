import { Router, Request, Response } from 'express';
import Container from "typedi";
import { LocationService } from "../../../services/app/LocationService";
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const locationService = Container.get(LocationService);

    router.get('/locations/countries', async (req: Request, res: Response) => {
        try {
            const result = await locationService.getCountries();
            return ResponseWrapper.success(res, result, 'Countries fetched successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.get('/locations/states', async (req: Request, res: Response) => {
        try {
            const { countryId } = req.query as any;
            if (!countryId) {
                return ResponseWrapper.error(res, 'countryId is required', 400);
            }
            const result = await locationService.getStates(countryId);
            return ResponseWrapper.success(res, result, 'States fetched successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.get('/locations/cities', async (req: Request, res: Response) => {
        try {
            const { countryId, stateId, search } = req.query as any;
            const result = await locationService.getCities({ countryId, stateId, search });
            return ResponseWrapper.success(res, result, 'Cities fetched successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });
}
