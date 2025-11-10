"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kafka_1 = __importDefault(require("../services/kafka"));
const logger_1 = __importDefault(require("../services/logger"));
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'thesis-demo-secret-change-in-production';
// Middleware to extract userId from token (optional)
function getUserId(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return decoded.userId?.toString() || 'guest';
        }
        catch (error) {
            return 'guest';
        }
    }
    return 'guest';
}
/**
 * POST /api/agent/query
 * Universal agent query endpoint - sends to user.requests topic
 * Orchestrator will route to appropriate agent
 */
router.post('/query', async (req, res) => {
    try {
        const { query, type, context } = req.body;
        const userId = getUserId(req);
        const requestId = (0, uuid_1.v4)();
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required',
            });
        }
        // Send to user.requests topic (new architecture)
        await kafka_1.default.sendEvent('user.requests', requestId, {
            requestId,
            userId,
            timestamp: new Date().toISOString(),
            query,
            type: type || undefined, // 'portfolio', 'news', 'market', 'risk', etc.
            context: context || {},
        });
        logger_1.default.info('User query sent to orchestrator', { requestId, userId, type });
        res.json({
            success: true,
            requestId,
            message: 'Query submitted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Agent query error', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to process query',
        });
    }
});
/**
 * GET /api/agent/response/:requestId
 * Get agent response (polling endpoint)
 */
router.get('/response/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        // This would typically check a cache/database for the response
        // For SSE implementation, responses are streamed directly
        res.json({
            success: true,
            message: 'Use SSE endpoint for real-time responses',
            sseEndpoint: `/api/agent/stream/${requestId}`,
        });
    }
    catch (error) {
        logger_1.default.error('Get response error', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to get response',
        });
    }
});
/**
 * GET /api/agent/stream/:requestId
 * Server-Sent Events (SSE) endpoint for streaming agent responses
 */
router.get('/stream/:requestId', async (req, res) => {
    const { requestId } = req.params;
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);
    // Start consuming agent.responses topic for this requestId
    const consumer = kafka_1.default.getConsumer(`sse-${requestId}`);
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'agent.responses', fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    const response = JSON.parse(message.value?.toString() || '{}');
                    // Check if this response is for our request
                    if (response.requestId === requestId || response.correlationId === requestId) {
                        res.write(`data: ${JSON.stringify(response)}\n\n`);
                        // If response is complete, close connection
                        if (response.status === 'success' || response.status === 'error') {
                            res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
                            await consumer.disconnect();
                            res.end();
                        }
                    }
                }
                catch (error) {
                    logger_1.default.error('SSE message processing error:', error);
                }
            },
        });
    }
    catch (error) {
        logger_1.default.error('SSE stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
        res.end();
    }
    // Cleanup on client disconnect
    req.on('close', async () => {
        try {
            await consumer.disconnect();
        }
        catch (error) {
            logger_1.default.error('Error disconnecting SSE consumer:', error);
        }
        res.end();
    });
});
/**
 * POST /api/agent/portfolio/advice (Legacy compatibility)
 * Redirects to unified /query endpoint
 */
router.post('/portfolio/advice', async (req, res) => {
    try {
        const { userId, investmentAmount, riskTolerance, preferences } = req.body;
        const requestId = (0, uuid_1.v4)();
        await kafka_1.default.sendEvent('user.requests', requestId, {
            requestId,
            userId: userId || getUserId(req),
            timestamp: new Date().toISOString(),
            query: `I want investment advice for ${investmentAmount || 5000000} MNT`,
            type: 'portfolio',
            context: {
                investmentAmount,
                riskTolerance,
                preferences,
            },
        });
        logger_1.default.info('Portfolio advice request sent', { requestId });
        res.json({
            success: true,
            requestId,
            message: 'Processing portfolio advice request',
        });
    }
    catch (error) {
        logger_1.default.error('Portfolio advice error', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to process portfolio advice request',
        });
    }
});
/**
 * POST /api/agent/news/latest (Legacy compatibility)
 */
router.post('/news/latest', async (req, res) => {
    try {
        const { symbols } = req.body;
        const userId = getUserId(req);
        const requestId = (0, uuid_1.v4)();
        await kafka_1.default.sendEvent('user.requests', requestId, {
            requestId,
            userId,
            timestamp: new Date().toISOString(),
            query: `Get latest news for ${symbols?.join(', ') || 'my watchlist'}`,
            type: 'news',
            context: {
                symbols,
            },
        });
        logger_1.default.info('News request sent', { requestId });
        res.json({
            success: true,
            requestId,
            message: 'Processing news request',
        });
    }
    catch (error) {
        logger_1.default.error('News request error', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to process news request',
        });
    }
});
exports.default = router;
//# sourceMappingURL=agent.routes.js.map