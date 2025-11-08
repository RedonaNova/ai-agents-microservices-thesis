import mongoose from 'mongoose';
import { config } from '../config';
import logger from './logger';

class MongoDBService {
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(config.mongoUri);
      this.isConnected = true;
      logger.info('Connected to MongoDB', { uri: config.mongoUri.replace(/\/\/.*@/, '//***@') });
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    }
  }

  getConnection() {
    return mongoose.connection;
  }
}

export default new MongoDBService();

