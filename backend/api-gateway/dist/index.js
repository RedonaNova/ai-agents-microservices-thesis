"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const logger_1 = __importDefault(require("./services/logger"));
const kafka_1 = __importDefault(require("./services/kafka"));
const database_1 = __importDefault(require("./services/database"));
// Routes
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const news_routes_1 = __importDefault(require("./routes/news.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const rag_routes_1 = __importDefault(require("./routes/rag.routes"));
const monitoring_routes_1 = __importDefault(require("./routes/monitoring.routes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({ origin: config_1.config.corsOrigin, credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'api-gateway'
    });
});
// API Routes
app.use('/api/users', users_routes_1.default);
app.use('/api/news', news_routes_1.default);
app.use('/api/agent', agent_routes_1.default);
app.use('/api/rag', rag_routes_1.default);
app.use('/api/monitoring', monitoring_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});
// Startup function
async function start() {
    try {
        logger_1.default.info('Starting API Gateway...', {
            env: config_1.config.nodeEnv,
            port: config_1.config.port
        });
        // Connect to PostgreSQL
        await database_1.default.connect();
        // Connect to Kafka
        await kafka_1.default.getProducer();
        // Start Express server
        app.listen(config_1.config.port, () => {
            logger_1.default.info(`API Gateway listening on port ${config_1.config.port}`);
            logger_1.default.info(`CORS enabled for: ${config_1.config.corsOrigin}`);
            logger_1.default.info(`Kafka broker: ${config_1.config.kafkaBroker}`);
            logger_1.default.info('API Gateway is ready!');
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start API Gateway', { error });
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully...');
    await kafka_1.default.disconnect();
    await database_1.default.disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully...');
    await kafka_1.default.disconnect();
    await database_1.default.disconnect();
    process.exit(0);
});
// Start the server
start();
//# sourceMappingURL=index.js.map