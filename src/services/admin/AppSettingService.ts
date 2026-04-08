import { Service } from 'typedi';
import AppSetting from '../../models/AppSetting';

@Service()
export class AppSettingService {
  public async getSettings() {
    let settings = await AppSetting.findOne();
    if (!settings) {
      settings = await AppSetting.create({
        platformFees: 0,
        reportReasons: ['Fraud', 'Abuse', 'Spam', 'Fake product']
      });
    }
    return settings;
  }

  public async updateSettings(data: { platformFees?: number; reportReasons?: string[] }) {
    let settings = await AppSetting.findOne();
    if (!settings) {
      return AppSetting.create(data);
    }
    if (data.platformFees !== undefined) settings.platformFees = data.platformFees;
    if (data.reportReasons !== undefined) settings.reportReasons = data.reportReasons;
    return settings.save();
  }
}
