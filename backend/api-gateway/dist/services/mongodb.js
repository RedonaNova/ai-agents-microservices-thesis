"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
class MongoDBService {
    isConnected = false;
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            await mongoose_1.default.connect(config_1.config.mongoUri);
            this.isConnected = true;
            logger_1.default.info('Connected to MongoDB', { uri: config_1.config.mongoUri.replace(/\/\/.*@/, '//***@') });
        }
        catch (error) {
            logger_1.default.error('Failed to connect to MongoDB', { error });
            throw error;
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            logger_1.default.info('Disconnected from MongoDB');
        }
    }
    getConnection() {
        return mongoose_1.default.connection;
    }
}
exports.default = new MongoDBService();
//# sourceMappingURL=mongodb.js.map