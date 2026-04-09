import { Express } from 'express';
import AppLogger from './logger';
import expressLoader from './express';
import dbLoader from './db';
import dependencyInjector from './di';
import cloudinaryLoader from './cloudinary';
import firebaseLoader from './firebase';

export default async (expressApp: Express): Promise<void> => {
    const mongoConnection = await dbLoader();
    const cloudinaryClient = await cloudinaryLoader();
    const firebaseApp = firebaseLoader();

    await dependencyInjector({
        mongoConnection,
        cloudinaryClient,
        firebaseApp,
    });

    expressLoader(expressApp);
    AppLogger.info('✌️ Express Loaded Successfully');
};
