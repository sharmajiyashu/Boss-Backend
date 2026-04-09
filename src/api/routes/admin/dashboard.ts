import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { DashboardService } from '../../../services/admin/DashboardService';
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const dashboardService = Container.get(DashboardService);

    // GET /api/admin/dashboard/stats - Get dashboard statistics
    router.get('/dashboard/stats', async (req: Request, res: Response) => {
        try {
            const stats = await dashboardService.getStats();
            return ResponseWrapper.success(res, stats, 'Dashboard stats retrieved successfully');
        } catch (error: any) {
            return ResponseWrapper.error(res, error);
        }
    });
};
