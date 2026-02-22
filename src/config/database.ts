import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Connects to MongoDB and sets up reconnection listeners.
 * Exits the process if the initial connection fails.
 */

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_db';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected. Reconnecting...')
  );
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
};
