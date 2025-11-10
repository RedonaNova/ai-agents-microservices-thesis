"use strict";
/**
 * MongoDB service for Daily News Agent
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = connect;
exports.getAllUsersForNews = getAllUsersForNews;
exports.getWatchlistByUserId = getWatchlistByUserId;
exports.disconnect = disconnect;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST
dotenv_1.default.config({ path: '/home/it/apps/thesis-report/backend/.env' });
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("./logger"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-db';
// User Schema (Better Auth format)
const userSchema = new mongoose_1.default.Schema({
    id: String,
    email: String,
    name: String,
    country: String
}, { collection: 'user', strict: false });
// Watchlist Schema
const watchlistSchema = new mongoose_1.default.Schema({
    userId: String,
    symbol: String,
    addedAt: Date
}, { collection: 'watchlist', strict: false });
const UserModel = mongoose_1.default.model('User', userSchema);
const WatchlistModel = mongoose_1.default.model('Watchlist', watchlistSchema);
/**
 * Connect to MongoDB
 */
async function connect() {
    try {
        if (mongoose_1.default.connection.readyState === 1) {
            logger_1.default.info('Already connected to MongoDB');
            return;
        }
        await mongoose_1.default.connect(MONGODB_URI);
        logger_1.default.info('Connected to MongoDB', { uri: MONGODB_URI });
    }
    catch (error) {
        logger_1.default.error('Failed to connect to MongoDB', { error });
        throw error;
    }
}
/**
 * Get all users who should receive daily news
 */
async function getAllUsersForNews() {
    try {
        const users = await UserModel.find({
            email: { $exists: true, $ne: null, $ne: '' },
            name: { $exists: true, $ne: null }
        }, { id: 1, _id: 1, email: 1, name: 1, country: 1 }).lean();
        return users
            .filter(user => user.email && user.name)
            .map(user => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name,
            country: user.country
        }));
    }
    catch (error) {
        logger_1.default.error('Error fetching users for news', { error });
        return [];
    }
}
/**
 * Get watchlist symbols for a user
 */
async function getWatchlistByUserId(userId) {
    try {
        if (!userId)
            return [];
        const items = await WatchlistModel.find({ userId }, { symbol: 1 }).lean();
        return items.map(item => String(item.symbol).trim().toUpperCase()).filter(Boolean);
    }
    catch (error) {
        logger_1.default.error('Error fetching watchlist', { userId, error });
        return [];
    }
}
/**
 * Disconnect from MongoDB
 */
async function disconnect() {
    try {
        await mongoose_1.default.disconnect();
        logger_1.default.info('Disconnected from MongoDB');
    }
    catch (error) {
        logger_1.default.error('Error disconnecting from MongoDB', { error });
    }
}
