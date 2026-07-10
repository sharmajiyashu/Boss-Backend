import { Country as CSCCountry, State as CSCState, City as CSCCity } from 'country-state-city';
import Country from '../models/Country';
import State from '../models/State';
import City from '../models/City';
import AppLogger from '../api/loaders/logger';

export async function seedIndiaLocations() {
    try {
        AppLogger.info('🧹 Clearing existing location data and indexes...');
        await Promise.all([
            Country.collection.dropIndexes().catch(() => { }),
            State.collection.dropIndexes().catch(() => { }),
            City.collection.dropIndexes().catch(() => { }),
            Country.deleteMany({}),
            State.deleteMany({}),
            City.deleteMany({})
        ]);

        AppLogger.info('🇮🇳 Starting India States & Cities Seeding...');

        // 1. Handle India Country entry
        let country = await Country.create({
            name: 'India',
            iso2: 'IN',
            iso3: 'IND',
            isActive: true
        });
        AppLogger.info('🇮🇳 Created Country entry for India.');

        // 2. Fetch states of India
        const cscStates = CSCState.getStatesOfCountry('IN');
        AppLogger.info(`🇮🇳 Found ${cscStates.length} states/UTs in India from location library.`);

        let stateCount = 0;
        let cityCount = 0;

        for (const s of cscStates) {
            const stateName = s.name.trim();
            const stateCode = s.isoCode || stateName.toUpperCase().replace(/\s+/g, '_').substring(0, 10);

            // Find or create State
            let state = await State.findOne({
                $or: [
                    { name: stateName, countryId: country._id },
                    { code: stateCode, countryId: country._id }
                ]
            });

            if (!state) {
                state = await State.create({
                    name: stateName,
                    code: stateCode,
                    countryId: country._id,
                    isActive: true
                });
                stateCount++;
            } else {
                // Ensure name and code are aligned/updated if needed
                if (state.name !== stateName || state.code !== stateCode) {
                    state.name = stateName;
                    state.code = stateCode;
                    await state.save();
                }
            }

            // 3. Fetch cities for this state
            const cscCities = CSCCity.getCitiesOfState('IN', s.isoCode);
            if (cscCities.length === 0) continue;

            // Get existing cities in DB for this state to prevent duplicate keys
            const existingCities = await City.find({ stateId: state._id }).select('name').exec();
            const existingCityNames = new Set(existingCities.map(c => c.name.toLowerCase().trim()));

            const citiesBuffer = [];
            for (const c of cscCities) {
                const cityName = c.name.trim();
                if (!existingCityNames.has(cityName.toLowerCase())) {
                    citiesBuffer.push({
                        name: cityName,
                        stateId: state._id,
                        countryId: country._id,
                        latitude: parseFloat(c.latitude || '') || 0,
                        longitude: parseFloat(c.longitude || '') || 0,
                        isActive: true
                    });
                }
            }

            if (citiesBuffer.length > 0) {
                await City.insertMany(citiesBuffer);
                cityCount += citiesBuffer.length;
            }
        }

        AppLogger.info(`✅ India Seeding Completed! Added ${stateCount} new states and ${cityCount} new cities.`);
    } catch (error) {
        AppLogger.error('❌ Error seeding India locations:', error);
        throw error;
    }
}
