import { Service } from 'typedi';
import CMSPage, { ICMSPage } from '../../models/CMSPage';
import AppLogger from '../../api/loaders/logger';

@Service()
export class CMSService {
  constructor() {}

  /**
   * Get all CMS pages.
   */
  public async getPages(): Promise<ICMSPage[]> {
    try {
      return await CMSPage.find().sort({ title: 1 }).exec();
    } catch (error) {
      AppLogger.error('❌ Error fetching CMS pages:', error);
      throw error;
    }
  }

  /**
   * Get a CMS page by slug.
   */
  public async getPageBySlug(slug: string): Promise<ICMSPage | null> {
    try {
      return await CMSPage.findOne({ slug }).exec();
    } catch (error) {
      AppLogger.error(`❌ Error fetching CMS page with slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Update or create a CMS page by slug.
   */
  public async upsertPage(slug: string, data: { title: string; content: string }): Promise<ICMSPage> {
    try {
      const page = await CMSPage.findOneAndUpdate(
        { slug },
        { $set: data },
        { new: true, upsert: true }
      ).exec();
      AppLogger.info(`✌️ CMS Page ${slug} upserted successfully.`);
      return page;
    } catch (error) {
      AppLogger.error(`❌ Error upserting CMS page ${slug}:`, error);
      throw error;
    }
  }
}
