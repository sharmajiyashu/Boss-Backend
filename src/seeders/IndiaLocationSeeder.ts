import { Country as CSCCountry, State as CSCState, City as CSCCity } from 'country-state-city';
import Country from '../models/Country';
import State from '../models/State';
import City from '../models/City';
import AppLogger from '../api/loaders/logger';

// Helper function to calculate Levenshtein distance between two strings
function getLevenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Helper function to calculate geographic distance using the Haversine formula
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Check if two cities are duplicates based on name similarity and geographical proximity
function areCitiesDuplicates(
    name1: string, lat1: number, lon1: number,
    name2: string, lat2: number, lon2: number
): boolean {
    const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact match (case insensitive, without spaces/special chars)
    if (n1 === n2) return true;

    // 2. Check distance
    const distance = getHaversineDistance(lat1, lon1, lat2, lon2);
    if (distance > 15) return false; // Too far to be the same place

    // 3. Spelling similarity
    const editDistance = getLevenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);
    const similarity = (maxLength - editDistance) / maxLength;

    // If within 15km and spelling is at least 75% similar
    if (similarity >= 0.75) {
        return true;
    }

    return false;
}

const ACTIVE_CITIES = new Set([
    // Andaman & Nicobar
    "port blair",
    // Andhra Pradesh
    "visakhapatnam", "vijayawada", "guntur", "nellore", "kurnool", "rajamahendravaram", "rajahmundry", "tirupati", "kakinada", "kadapa", "anantapur", "eluru", "vizianagaram",
    // Arunachal Pradesh
    "itanagar",
    // Assam
    "guwahati", "silchar", "dibrugarh", "jorhat", "nagaon",
    // Bihar
    "patna", "gaya", "bhagalpur", "muzaffarpur", "purnia", "darbhanga", "bihar sharif", "arrah", "begusarai",
    // Chandigarh
    "chandigarh",
    // Chhattisgarh
    "raipur", "durg", "bilaspur", "korba", "rajnandgaon",
    // Dadra & Nagar Haveli
    "daman", "silvassa",
    // Delhi
    "delhi", "new delhi",
    // Goa
    "panaji", "margao",
    // Gujarat
    "ahmedabad", "surat", "vadodara", "rajkot", "bhavnagar", "jamnagar", "junagadh", "gandhinagar", "anand", "morbi", "nadiad", "surendranagar", "bharuch",
    // Haryana
    "faridabad", "gurugram", "panipat", "ambala", "yamunanagar", "rohtak", "hisar", "karnal", "sonipat", "panchkula",
    // Himachal Pradesh
    "shimla", "dharamshala",
    // Jammu & Kashmir
    "srinagar", "jammu",
    // Jharkhand
    "jamshedpur", "dhanbad", "ranchi", "bokaro steel city", "bokaro", "deoghar", "phusro", "hazaribagh",
    // Karnataka
    "bengaluru", "bangalore", "hubballi-dharwad", "hubli", "dharwad", "mysuru", "mysore", "kalaburagi", "gulbarga", "mangaluru", "mangalore", "belagavi", "belgaum", "davanagere", "ballari", "bellary", "tumakuru", "tumkur", "shivamogga", "shimoga",
    // Kerala
    "thiruvananthapuram", "trivandrum", "kochi", "cochin", "kozhikode", "calicut", "kollam", "quilon", "thrissur", "trichur", "alappuzha", "alleppey", "palakkad", "palghat", "malappuram",
    // Ladakh
    "leh",
    // Lakshadweep
    "kavaratti",
    // Madhya Pradesh
    "indore", "bhopal", "jabalpur", "gwalior", "ujjain", "sagar", "dewas", "satna", "ratlam", "rewa", "murwara", "katni", "singrauli",
    // Maharashtra
    "mumbai", "bombay", "pune", "nagpur", "thane", "pimpri-chinchwad", "nashik", "kalyan-dombivli", "vasai-virar", "aurangabad", "navi mumbai", "solapur", "mira-bhayandar", "bhiwandi", "amravati", "nanded", "kolhapur", "sangli", "jalgaon", "akola", "latur", "dhule", "ahmednagar", "chandrapur", "parbhani", "ichalkaranji", "jalna", "bhusawal",
    // Manipur
    "imphal",
    // Meghalaya
    "shillong",
    // Mizoram
    "aizawl",
    // Nagaland
    "dimapur", "kohima",
    // Odisha
    "bhubaneswar", "cuttack", "rourkela", "sambalpur", "puri", "balasore", "bhadrak",
    // Puducherry
    "ozhukarai", "puducherry", "pondicherry",
    // Punjab
    "ludhiana", "amritsar", "jalandhar", "patiala", "bathinda", "mohali", "hoshiarpur", "pathankot",
    // Rajasthan
    "jaipur", "jodhpur", "kota", "bikaner", "ajmer", "udaipur", "bhilwara", "alwar", "sikar", "sri ganganagar", "bharatpur",
    // Sikkim
    "gangtok",
    // Tamil Nadu
    "chennai", "madras", "coimbatore", "madurai", "tiruchirappalli", "trichy", "salem", "tiruppur", "erode", "vellore", "thoothukudi", "tuticorin", "tirunelveli", "nagercoil", "thanjavur", "dindigul",
    // Telangana
    "hyderabad", "warangal", "nizamabad", "karimnagar", "ramagundam", "khammam", "mahbubnagar",
    // Tripura
    "agartala",
    // Uttar Pradesh
    "lucknow", "kanpur", "ghaziabad", "agra", "meerut", "varanasi", "prayagraj", "allahabad", "bareilly", "aligarh", "moradabad", "saharanpur", "noida", "gorakhpur", "jhansi", "firozabad", "muzaffarnagar", "mathura", "ayodhya", "rampur", "shahjahanpur",
    // Uttarakhand
    "dehradun", "haridwar", "roorkee", "haldwani", "rudrapur", "kashipur", "rishikesh",
    // West Bengal
    "kolkata", "calcutta", "howrah", "asansol", "siliguri", "durgapur", "bardhaman", "english bazar", "malda", "baharampur", "kharagpur", "shantipur"
]);

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

            const citiesBuffer: any[] = [];

            for (const c of cscCities) {
                const cityName = c.name.trim();
                const lat = parseFloat(c.latitude || '') || 0;
                const lon = parseFloat(c.longitude || '') || 0;

                // Check if this city is a duplicate of one we already decided to seed for this state
                const isDuplicate = citiesBuffer.some(existing =>
                    areCitiesDuplicates(existing.name, existing.latitude, existing.longitude, cityName, lat, lon)
                );

                if (!isDuplicate) {
                    const isCityActive = ACTIVE_CITIES.has(cityName.toLowerCase());
                    citiesBuffer.push({
                        name: cityName,
                        stateId: state._id,
                        countryId: country._id,
                        latitude: lat,
                        longitude: lon,
                        isActive: isCityActive
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
