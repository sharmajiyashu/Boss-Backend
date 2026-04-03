import { Service } from 'typedi';
import User, { IUser } from '../../models/User';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class UserService {
    constructor() { }

    /**
     * List users with optional pagination and filters.
     */
    public async getUsers(
        pagination: IPagination,
        filters: { search?: string; role?: string; city?: string; state?: string } = {}
    ): Promise<IPaginatedResponse<IUser>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = { userRole: 'user' }; // List only standard users by default
            
            if (filters.role) query.userRole = filters.role;

            if (filters.search) {
                query.$or = [
                    { firstName: { $regex: filters.search, $options: 'i' } },
                    { lastName: { $regex: filters.search, $options: 'i' } },
                    { email: { $regex: filters.search, $options: 'i' } },
                    { mobile: { $regex: filters.search, $options: 'i' } }
                ];
            }

            if (filters.city) query['location.city'] = { $regex: filters.city, $options: 'i' };
            if (filters.state) query['location.state'] = { $regex: filters.state, $options: 'i' };

            const [data, total] = await Promise.all([
                User.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                User.countDocuments(query)
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };
        } catch (error) {
            AppLogger.error('❌ Error fetching users:', error);
            throw error;
        }
    }

    /**
     * Get user details by ID.
     */
    public async getUserById(id: string): Promise<IUser | null> {
        return User.findById(id);
    }

    /**
     * Update user details (for admin).
     */
    public async updateUser(id: string, data: Partial<IUser>): Promise<IUser | null> {
        return User.findByIdAndUpdate(id, data, { new: true });
    }
}
