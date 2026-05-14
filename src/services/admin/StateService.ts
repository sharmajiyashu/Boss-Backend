import { Service } from 'typedi';
import State, { IState } from '../../models/State';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class StateService {
    constructor() { }

    public async createState(data: Partial<IState>): Promise<IState> {
        try {
            const state = await State.create(data);
            AppLogger.info(`✌️ State ${state.name} created successfully.`);
            return state;
        } catch (error) {
            AppLogger.error('❌ Error creating state:', error);
            throw error;
        }
    }

    public async getStates(
        pagination: IPagination,
        filters: { countryId?: string; isActive?: boolean; search?: string } = {}
    ): Promise<IPaginatedResponse<IState>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.countryId) query.countryId = filters.countryId;
            if (filters.isActive !== undefined) query.isActive = filters.isActive;
            if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

            const [data, total] = await Promise.all([
                State.find(query)
                    .populate('countryId')
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                State.countDocuments(query)
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
            AppLogger.error('❌ Error fetching states:', error);
            throw error;
        }
    }

    public async getAllStates(): Promise<IState[]> {
        return State.find({ isActive: true }).sort({ name: 1 });
    }

    public async updateState(id: string, data: Partial<IState>): Promise<IState | null> {
        try {
            const updatedState = await State.findByIdAndUpdate(id, data, { new: true });
            if (!updatedState) {
                AppLogger.warn(`⚠️ State ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ State ${id} updated successfully.`);
            return updatedState;
        } catch (error) {
            AppLogger.error(`❌ Error updating state ${id}:`, error);
            throw error;
        }
    }

    public async deleteState(id: string): Promise<boolean> {
        try {
            const result = await State.findByIdAndDelete(id);
            if (!result) {
                AppLogger.warn(`⚠️ State ${id} not found for deletion.`);
                return false;
            }
            AppLogger.info(`✌️ State ${id} deleted successfully.`);
            return true;
        } catch (error) {
            AppLogger.error(`❌ Error deleting state ${id}:`, error);
            throw error;
        }
    }

    public async getStateById(id: string): Promise<IState | null> {
        return State.findById(id);
    }
}
