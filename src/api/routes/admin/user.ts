import { Router, Request, Response } from 'express';
import Container from "typedi";
import { UserService } from "../../../services/admin/UserService";
import { ResponseWrapper } from '../../responseWrapper';

export default (router: Router) => {
    const userService = Container.get(UserService);

    // GET /api/admin/users - Get paginated users with filters
    router.get('/users',
        async (req: Request, res: Response) => {
            try {
                const { page = 1, limit = 10, search, city, state, role } = req.query as any;
                
                const result = await userService.getUsers(
                    { page: parseInt(page), limit: parseInt(limit) },
                    { search, city, state, role }
                );
                
                return ResponseWrapper.success(res, result, 'Users fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });

    // GET /api/admin/users/:id - Get single user
    router.get('/users/:id',
        async (req: Request, res: Response) => {
            try {
                const id = req.params.id as string;
                const result = await userService.getUserById(id);
                if (!result) return ResponseWrapper.error(res, 'User not found', 404);
                
                return ResponseWrapper.success(res, result, 'User details fetched successfully');
            } catch (error: any) {
                return ResponseWrapper.error(res, error.message);
            }
        });
}
