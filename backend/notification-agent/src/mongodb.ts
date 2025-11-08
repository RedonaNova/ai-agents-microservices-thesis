/**
 * MongoDB service for Daily News Agent
 */

import dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config({ path: '/home/it/apps/thesis-report/backend/.env' });

import mongoose from 'mongoose';
import { User, WatchlistItem } from './types';
import logger from './logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-db';

// User Schema (Better Auth format)
const userSchema = new mongoose.Schema({
  id: String,
  email: String,
  name: String,
  country: String
}, { collection: 'user', strict: false });

// Watchlist Schema
const watchlistSchema = new mongoose.Schema({
  userId: String,
  symbol: String,
  addedAt: Date
}, { collection: 'watchlist', strict: false });

const UserModel = mongoose.model('User', userSchema);
const WatchlistModel = mongoose.model('Watchlist', watchlistSchema);

/**
 * Connect to MongoDB
 */
export async function connect(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info('Already connected to MongoDB');
      return;
    }

    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

/**
 * Get all users who should receive daily news
 */
export async function getAllUsersForNews(): Promise<User[]> {
  try {
    const users = await UserModel.find(
      { 
        email: { $exists: true, $ne: null, $ne: '' },
        name: { $exists: true, $ne: null }
      },
      { id: 1, _id: 1, email: 1, name: 1, country: 1 }
    ).lean();

    return users
      .filter(user => user.email && user.name)
      .map(user => ({
        id: user.id || user._id?.toString() || '',
        email: user.email,
        name: user.name,
        country: user.country
      }));
  } catch (error) {
    logger.error('Error fetching users for news', { error });
    return [];
  }
}

/**
 * Get watchlist symbols for a user
 */
export async function getWatchlistByUserId(userId: string): Promise<string[]> {
  try {
    if (!userId) return [];

    const items = await WatchlistModel.find(
      { userId },
      { symbol: 1 }
    ).lean();

    return items.map(item => String(item.symbol).trim().toUpperCase()).filter(Boolean);
  } catch (error) {
    logger.error('Error fetching watchlist', { userId, error });
    return [];
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnect(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error });
  }
}

