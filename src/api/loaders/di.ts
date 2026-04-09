import AppLogger from './logger';
import Container from 'typedi';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import type admin from 'firebase-admin';

export default async ({
    mongoConnection,
    cloudinaryClient,
    firebaseApp,
}: {
    mongoConnection: typeof mongoose;
    cloudinaryClient: typeof cloudinary;
    firebaseApp: admin.app.App | null;
}): Promise<void> => {
    Container.set('mongoConnection', mongoConnection);
    Container.set('cloudinaryClient', cloudinaryClient);
    Container.set('firebaseApp', firebaseApp);
    AppLogger.info('✌️ Dependency Injector Loaded');
};
