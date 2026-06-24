import { Express } from 'express';
import AppLogger from './logger';
import expressLoader from './express';
import dbLoader from './db';
import dependencyInjector from './di';
import cloudinaryLoader from './cloudinary';
import firebaseLoader from './firebase';
import smtpLoader from './smtp';

export default async (expressApp: Express): Promise<void> => {
    const mongoConnection = await dbLoader();

    // Auto-seed CMS pages, settings, and FAQs if missing
    try {
        const { seedCMSPages } = await import('../../seeders/CMSPageSeeder');
        await seedCMSPages();
        const { seedSettings } = await import('../../seeders/SettingSeeder');
        await seedSettings();
        const { seedFAQs } = await import('../../seeders/FAQSeeder');
        await seedFAQs();
    } catch (err) {
        AppLogger.error('❌ Failed to run auto-seeders:', err);
    }

    const cloudinaryClient = await cloudinaryLoader();
    const firebaseApp = firebaseLoader();
    const emailClient = await smtpLoader();

    await dependencyInjector({
        mongoConnection,
        cloudinaryClient,
        firebaseApp,
        emailClient,
    });

    expressLoader(expressApp);
    AppLogger.info('✌️ Express Loaded Successfully');
};
