"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
exports.config = {
    // Server
    port: parseInt(process.env.API_GATEWAY_PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // CORS
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    // Kafka
    kafkaBroker: process.env.KAFKA_BROKER || 'localhost:9092',
    kafkaClientId: 'api-gateway',
    // MongoDB
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis-db',
    // Gemini AI
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // Email (Nodemailer)
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    emailFrom: process.env.EMAIL_FROM || 'noreply@thesis.com',
    // JWT
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    // Rate Limiting
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
};
//# sourceMappingURL=config.js.map