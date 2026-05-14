import { Router, Request, Response } from 'express';
import Container from "typedi";
import { StateService } from "../../../services/admin/StateService";
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const stateService = Container.get(StateService);

    router.get('/states', async (req: Request, res: Response) => {
        try {
            const { page, limit, search, countryId, isActive } = req.query as any;
            if (page && limit) {
                const result = await stateService.getStates(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { countryId, search, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined }
                );
                return ResponseWrapper.success(res, result, 'States fetched successfully');
            } else {
                const result = await stateService.getAllStates();
                return ResponseWrapper.success(res, result, 'All states fetched successfully');
            }
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.post('/states', async (req: Request, res: Response) => {
        try {
            const result = await stateService.createState(req.body);
            return ResponseWrapper.success(res, result, 'State created successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.put('/states/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await stateService.updateState(id, req.body);
            if (!result) return ResponseWrapper.error(res, 'State not found', 404);
            return ResponseWrapper.success(res, result, 'State updated successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });

    router.delete('/states/:id', async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const result = await stateService.deleteState(id);
            if (!result) return ResponseWrapper.error(res, 'State not found', 404);
            return ResponseWrapper.success(res, null, 'State deleted successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error.message);
        }
    });
}
