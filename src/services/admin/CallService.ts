import { Service } from 'typedi';
import Call, { ICall } from '../../models/Call';
import CallHistory, { ICallHistory } from '../../models/CallHistory';
import User from '../../models/User';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()

export class CallService {
    /**
     * List all scheduled calls (for admin)
     */
    public async getScheduledCalls(
        pagination: IPagination,
        filters: { search?: string; status?: string } = {}
    ): Promise<IPaginatedResponse<ICall>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.search) {
                const matchedUsers = await User.find({
                    $or: [
                        { firstName: { $regex: filters.search, $options: 'i' } },
                        { lastName: { $regex: filters.search, $options: 'i' } },
                    ]
                }).select('_id');
                const userIds = matchedUsers.map((u: any) => u._id);
                query.$or = [
                    { caller: { $in: userIds } },
                    { receiver: { $in: userIds } },
                ];
            }

            const [data, total] = await Promise.all([
                Call.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate({
                        path: 'caller',
                        select: 'firstName lastName profileImage',
                        populate: { path: 'profileImage', select: 'url' }
                    })
                    .populate({
                        path: 'receiver',
                        select: 'firstName lastName profileImage',
                        populate: { path: 'profileImage', select: 'url' }
                    })
                    .exec(),
                Call.countDocuments(query)
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
            AppLogger.error('❌ Error fetching scheduled calls:', error);
            throw error;
        }
    }

    /**
     * List all call logs (for admin)
     */
    public async getCallHistory(
        pagination: IPagination,
        filters: { search?: string; status?: string } = {}
    ): Promise<IPaginatedResponse<ICallHistory>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.search) {
                const matchedUsers = await User.find({
                    $or: [
                        { firstName: { $regex: filters.search, $options: 'i' } },
                        { lastName: { $regex: filters.search, $options: 'i' } },
                    ]
                }).select('_id');
                const userIds = matchedUsers.map((u: any) => u._id);
                query.$or = [
                    { caller: { $in: userIds } },
                    { receiver: { $in: userIds } },
                ];
            }

            const [data, total] = await Promise.all([
                CallHistory.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate({
                        path: 'caller',
                        select: 'firstName lastName profileImage',
                        populate: { path: 'profileImage', select: 'url' }
                    })
                    .populate({
                        path: 'receiver',
                        select: 'firstName lastName profileImage',
                        populate: { path: 'profileImage', select: 'url' }
                    })
                    .exec(),
                CallHistory.countDocuments(query)
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
            AppLogger.error('❌ Error fetching call histories:', error);
            throw error;
        }
    }
}
