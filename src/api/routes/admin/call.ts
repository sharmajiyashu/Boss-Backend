import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { CallService } from '../../../services/admin/CallService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    // Resolve AdminCallService by its typedi key
    const callService = Container.get<CallService>('AdminCallService');

    // GET /api/admin/calls - List scheduled calls
    router.get('/calls',
        async (req: Request, res: Response) => {
            try {
                const { page = 1, limit = 10, search, status } = req.query as any;

                const result = await callService.getScheduledCalls(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { search, status }
                );

                return ResponseWrapper.success(res, result, 'Scheduled calls fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message || error);
            }
        });

    // GET /api/admin/calls/history - List actual call logs
    router.get('/calls/history',
        async (req: Request, res: Response) => {
            try {
                const { page = 1, limit = 10, search, status } = req.query as any;

                const result = await callService.getCallHistory(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { search, status }
                );

                return ResponseWrapper.success(res, result, 'Call history logs fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message || error);
            }
        });
};
