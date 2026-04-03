import AppLogger from './logger';
import Container from 'typedi';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

export default async ({
    mongoConnection,
    cloudinaryClient
}: {
    mongoConnection: typeof mongoose;
    cloudinaryClient: typeof cloudinary;
}): Promise<void> => {
    Container.set('mongoConnection', mongoConnection);
    Container.set('cloudinaryClient', cloudinaryClient);
    AppLogger.info('✌️ Dependency Injector Loaded');
};
