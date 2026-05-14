import { Service } from 'typedi';
import City, { ICity } from '../../models/City';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class CityService {
    constructor() { }

    public async createCity(data: Partial<ICity>): Promise<ICity> {
        try {
            const city = await City.create(data);
            const populatedCity = await city.populate('stateId');
            AppLogger.info(`✌️ City ${populatedCity.name} created successfully.`);
            return populatedCity;
        } catch (error) {
            AppLogger.error('❌ Error creating city:', error);
            throw error;
        }
    }

    public async getCities(
        pagination: IPagination,
        filters: { countryId?: string; stateId?: string; isActive?: boolean; search?: string } = {}
    ): Promise<IPaginatedResponse<ICity>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.countryId) query.countryId = filters.countryId;
            if (filters.stateId) query.stateId = filters.stateId;
            if (filters.isActive !== undefined) query.isActive = filters.isActive;
            if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

            const [data, total] = await Promise.all([
                City.find(query)
                    .populate('countryId')
                    .populate('stateId')
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                City.countDocuments(query)
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
            AppLogger.error('❌ Error fetching cities:', error);
            throw error;
        }
    }

    public async updateCity(id: string, data: Partial<ICity>): Promise<ICity | null> {
        try {
            const updatedCity = await City.findByIdAndUpdate(id, data, { new: true }).populate('stateId');
            if (!updatedCity) {
                AppLogger.warn(`⚠️ City ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ City ${id} updated successfully.`);
            return updatedCity;
        } catch (error) {
            AppLogger.error(`❌ Error updating city ${id}:`, error);
            throw error;
        }
    }

    public async deleteCity(id: string): Promise<boolean> {
        try {
            const result = await City.findByIdAndDelete(id);
            if (!result) {
                AppLogger.warn(`⚠️ City ${id} not found for deletion.`);
                return false;
            }
            AppLogger.info(`✌️ City ${id} deleted successfully.`);
            return true;
        } catch (error) {
            AppLogger.error(`❌ Error deleting city ${id}:`, error);
            throw error;
        }
    }

    public async getCityById(id: string): Promise<ICity | null> {
        return City.findById(id).populate('stateId');
    }

    public async getCitiesByState(stateId: string): Promise<ICity[]> {
        return City.find({ stateId, isActive: true }).sort({ name: 1 });
    }
}
