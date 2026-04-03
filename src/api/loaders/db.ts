import mongoose from 'mongoose';
import config from '../../config';
import AppLogger from './logger';

export default async (): Promise<typeof mongoose> => {
    if (!config.database.mongo.uri) {
        throw new Error('MONGODB_URI is not set in config');
    }

    try {
        const connection = await mongoose.connect(config.database.mongo.uri, {
            // Add options here if needed, but modern Mongoose handles defaults well
        });
        AppLogger.info('✌️ MongoDB connected successfully');
        return connection;
    } catch (error) {
        AppLogger.error('❌ Error connecting to MongoDB', error);
        throw error;
    }
};
