import { Service } from 'typedi';
import Country, { ICountry } from '../../models/Country';
import { IPagination, IPaginatedResponse } from '../../interfaces';
import AppLogger from '../../api/loaders/logger';

@Service()
export class CountryService {
    constructor() { }

    public async createCountry(data: Partial<ICountry>): Promise<ICountry> {
        try {
            const country = await Country.create(data);
            AppLogger.info(`✌️ Country ${country.name} created successfully.`);
            return country;
        } catch (error) {
            AppLogger.error('❌ Error creating country:', error);
            throw error;
        }
    }

    public async getCountries(
        pagination: IPagination,
        filters: { isActive?: boolean; search?: string } = {}
    ): Promise<IPaginatedResponse<ICountry>> {
        try {
            const { page, limit } = pagination;
            const skip = (page - 1) * limit;

            const query: any = {};
            if (filters.isActive !== undefined) query.isActive = filters.isActive;
            if (filters.search) {
                query.$or = [
                    { name: { $regex: filters.search, $options: 'i' } },
                    { iso2: { $regex: filters.search, $options: 'i' } },
                    { iso3: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const [data, total] = await Promise.all([
                Country.find(query)
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                Country.countDocuments(query)
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
            AppLogger.error('❌ Error fetching countries:', error);
            throw error;
        }
    }

    public async getAllCountries(): Promise<ICountry[]> {
        return Country.find({ isActive: true }).sort({ name: 1 });
    }

    public async updateCountry(id: string, data: Partial<ICountry>): Promise<ICountry | null> {
        try {
            const updatedCountry = await Country.findByIdAndUpdate(id, data, { new: true });
            if (!updatedCountry) {
                AppLogger.warn(`⚠️ Country ${id} not found for update.`);
                return null;
            }
            AppLogger.info(`✌️ Country ${id} updated successfully.`);
            return updatedCountry;
        } catch (error) {
            AppLogger.error(`❌ Error updating country ${id}:`, error);
            throw error;
        }
    }

    public async deleteCountry(id: string): Promise<boolean> {
        try {
            const result = await Country.findByIdAndDelete(id);
            if (!result) {
                AppLogger.warn(`⚠️ Country ${id} not found for deletion.`);
                return false;
            }
            AppLogger.info(`✌️ Country ${id} deleted successfully.`);
            return true;
        } catch (error) {
            AppLogger.error(`❌ Error deleting country ${id}:`, error);
            throw error;
        }
    }

    public async getCountryById(id: string): Promise<ICountry | null> {
        return Country.findById(id);
    }
}
