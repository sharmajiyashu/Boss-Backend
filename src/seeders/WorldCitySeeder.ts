import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Country from '../models/Country';
import State from '../models/State';
import City from '../models/City';
import AppLogger from '../api/loaders/logger';

export async function seedWorldCities() {
    try {
        AppLogger.info('🌍 Starting Optimized World Cities Seeding...');

        // Clear existing data to avoid schema conflicts
        AppLogger.info('🧹 Clearing existing location data and indexes...');
        await Promise.all([
            Country.collection.dropIndexes().catch(() => {}),
            State.collection.dropIndexes().catch(() => {}),
            City.collection.dropIndexes().catch(() => {}),
            Country.deleteMany({}),
            State.deleteMany({}),
            City.deleteMany({})
        ]);

        const csvPath = path.join(__dirname, 'worldcities.csv');
        if (!fs.existsSync(csvPath)) {
            AppLogger.warn(`⚠️ worldcities.csv not found at ${csvPath}`);
            return;
        }

        const fileStream = fs.createReadStream(csvPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const countryCache: Record<string, any> = {};
        const stateCache: Record<string, any> = {};
        let citiesBuffer: any[] = [];
        const BATCH_SIZE = 1000;

        let isFirstLine = true;
        let count = 0;

        for await (const line of rl) {
            if (isFirstLine) {
                isFirstLine = false;
                continue;
            }

            // Simple CSV parser for quoted strings
            const parts = line.split('","').map(p => p.replace(/"/g, ''));
            if (parts.length < 11) continue;

            const [
                cityName,
                cityAscii,
                lat,
                lng,
                countryName,
                iso2,
                iso3,
                adminName,
                capital,
                population,
                id
            ] = parts;

            // 1. Handle Country (Sequential since they are few)
            let country = countryCache[iso2];
            if (!country) {
                country = await Country.findOne({ iso2 });
                if (!country) {
                    country = await Country.create({
                        name: countryName,
                        iso2,
                        iso3,
                        isActive: true
                    });
                }
                countryCache[iso2] = country;
            }

            // 2. Handle State (Sequential since they are few compared to cities)
            const sName = adminName || countryName;
            const stateKey = `${iso2}_${sName}`;
            let state = stateCache[stateKey];
            if (!state) {
                state = await State.findOne({ name: sName, countryId: country._id });
                if (!state) {
                    state = await State.create({
                        name: sName,
                        code: sName.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
                        countryId: country._id,
                        isActive: true
                    });
                }
                stateCache[stateKey] = state;
            }

            // 3. Buffer City for Bulk Insert
            citiesBuffer.push({
                name: cityName,
                stateId: state._id,
                countryId: country._id,
                latitude: parseFloat(lat) || 0,
                longitude: parseFloat(lng) || 0,
                isActive: true
            });

            if (citiesBuffer.length >= BATCH_SIZE) {
                await City.insertMany(citiesBuffer);
                count += citiesBuffer.length;
                AppLogger.info(`📍 Seeded ${count} cities...`);
                citiesBuffer = [];
            }
        }

        // Final buffer flush
        if (citiesBuffer.length > 0) {
            await City.insertMany(citiesBuffer);
            count += citiesBuffer.length;
        }

        AppLogger.info(`✅ World Cities Seeding Completed! Total cities: ${count}`);
    } catch (error) {
        AppLogger.error('❌ Error seeding world cities:', error);
        throw error;
    }
}
