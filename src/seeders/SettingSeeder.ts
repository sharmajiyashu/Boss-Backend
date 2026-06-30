import AppLogger from '../api/loaders/logger';
import AppSetting from '../models/AppSetting';

export async function seedSettings() {
  try {
    const settings = await AppSetting.findOne();
    if (!settings) {
      await AppSetting.create({
        platformFees: 0,
        reportReasons: ['Fraud', 'Abuse', 'Spam', 'Fake product'],
        locationRanges: [
          { id: 'range_1', min: 0, max: 5, label: '0 to 5 km' },
          { id: 'range_2', min: 5, max: 10, label: '5 to 10 km' },
          { id: 'range_3', min: 10, max: 20, label: '10 to 20 km' },
          { id: 'range_4', min: 20, max: 50, label: '20 to 50 km' },
          { id: 'range_5', min: 50, max: 100, label: '50 to 100 km' },
          { id: 'range_6', min: 100, max: 500, label: '100+ km' }
        ],
        defaultNearbyEnabled: false,
        defaultNearbyDistanceKm: 50,
      });
      AppLogger.info('🌱 Seeded default App Settings.');
    }
  } catch (error) {
    AppLogger.error('❌ Error seeding App Settings:', error);
  }
}
