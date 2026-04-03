import { Express } from 'express';
import AppLogger from './logger';
import expressLoader from './express';
import dbLoader from './db';
import dependencyInjector from './di';
import cloudinaryLoader from './cloudinary';

export default async (expressApp: Express): Promise<void> => {
    const mongoConnection = await dbLoader();
    const cloudinaryClient = await cloudinaryLoader();

    await dependencyInjector({
        mongoConnection,
        cloudinaryClient
    });

    expressLoader(expressApp);
    AppLogger.info('✌️ Express Loaded Successfully');
};
