import { Service } from 'typedi';
import Country, { ICountry } from '../../models/Country';
import State, { IState } from '../../models/State';
import City, { ICity } from '../../models/City';
import AppLogger from '../../api/loaders/logger';

@Service()
export class LocationService {
    constructor() { }

    public async getCountries(): Promise<ICountry[]> {
        try {
            return await Country.find({ isActive: true }).sort({ name: 1 }).exec();
        } catch (error) {
            AppLogger.error('❌ Error fetching countries for app:', error);
            throw error;
        }
    }

    public async getStates(countryId: string): Promise<IState[]> {
        try {
            return await State.find({ countryId, isActive: true }).sort({ name: 1 }).exec();
        } catch (error) {
            AppLogger.error(`❌ Error fetching states for country ${countryId} for app:`, error);
            throw error;
        }
    }

    public async getCities(filters: { countryId?: string; stateId?: string; search?: string }): Promise<ICity[]> {
        try {
            const query: any = { isActive: true };
            if (filters.countryId) query.countryId = filters.countryId;
            if (filters.stateId) query.stateId = filters.stateId;
            if (filters.search) {
                query.name = { $regex: filters.search, $options: 'i' };
            }

            return await City.find(query).sort({ name: 1 }).limit(100).exec();
        } catch (error) {
            AppLogger.error('❌ Error fetching cities for app:', error);
            throw error;
        }
    }
}
