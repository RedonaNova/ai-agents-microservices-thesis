"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kafka_1 = __importDefault(require("../services/kafka"));
const logger_1 = __importDefault(require("../services/logger"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * POST /api/agent/portfolio/advice
 * Get investment recommendations from Portfolio Advisor Agent
 */
router.post('/portfolio/advice', async (req, res) => {
    try {
        const { userId, investmentAmount, riskTolerance, preferences } = req.body;
        const requestId = (0, uuid_1.v4)();
        // Route to consolidated Investment Agent
        await kafka_1.default.sendEvent('portfolio-requests', requestId, {
            requestId,
            userId: userId || 'guest',
            type: 'portfolio_advice',
            message: `I want to invest ${investmentAmount || '5M'} MNT`,
            metadata: {
                investmentAmount,
                riskTolerance,
                preferences
            },
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('Portfolio advice request sent (consolidated)', { requestId, userId });
        res.json({
            success: true,
            requestId,
            message: 'Processing portfolio advice request'
        });
    }
    catch (error) {
        logger_1.default.error('Portfolio advice error', { error });
        res.status(500).json({ error: 'Failed to process portfolio advice request' });
    }
});
/**
 * POST /api/agent/market/analyze
 * Get market analysis from Market Analysis Agent
 */
router.post('/market/analyze', async (req, res) => {
    try {
        const { userId } = req.body;
        const requestId = (0, uuid_1.v4)();
        // Route to consolidated Investment Agent
        await kafka_1.default.sendEvent('market-analysis-requests', requestId, {
            requestId,
            userId: userId || 'guest',
            type: 'market_analysis',
            message: 'Analyze current market trends',
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('Market analysis request sent (consolidated)', { requestId });
        res.json({
            success: true,
            requestId,
            message: 'Processing market analysis request'
        });
    }
    catch (error) {
        logger_1.default.error('Market analysis error', { error });
        res.status(500).json({ error: 'Failed to process market analysis request' });
    }
});
/**
 * POST /api/agent/historical/analyze
 * Get technical analysis from Historical Analysis Agent
 */
router.post('/historical/analyze', async (req, res) => {
    try {
        const { userId, symbol, period } = req.body;
        const requestId = (0, uuid_1.v4)();
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }
        // Route to consolidated Investment Agent
        await kafka_1.default.sendEvent('historical-analysis-requests', requestId, {
            requestId,
            userId: userId || 'guest',
            type: 'historical_analysis',
            message: `Analyze historical data for ${symbol}`,
            parameters: {
                symbol,
                period: period || 90
            },
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('Historical analysis request sent (consolidated)', { requestId, symbol });
        res.json({
            success: true,
            requestId,
            message: 'Processing historical analysis request'
        });
    }
    catch (error) {
        logger_1.default.error('Historical analysis error', { error });
        res.status(500).json({ error: 'Failed to process historical analysis request' });
    }
});
/**
 * POST /api/agent/risk/assess
 * Get risk assessment from Risk Assessment Agent
 */
router.post('/risk/assess', async (req, res) => {
    try {
        const { userId, portfolio, symbols, confidenceLevel } = req.body;
        const requestId = (0, uuid_1.v4)();
        // Route to consolidated Investment Agent
        await kafka_1.default.sendEvent('risk-assessment-requests', requestId, {
            requestId,
            userId: userId || 'guest',
            type: 'risk_assessment',
            message: 'Assess portfolio risk',
            parameters: {
                portfolio,
                symbols: symbols || [],
                confidenceLevel: confidenceLevel || 0.95
            },
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('Risk assessment request sent (consolidated)', { requestId });
        res.json({
            success: true,
            requestId,
            message: 'Processing risk assessment request'
        });
    }
    catch (error) {
        logger_1.default.error('Risk assessment error', { error });
        res.status(500).json({ error: 'Failed to process risk assessment request' });
    }
});
/**
 * GET /api/agent/stream/:requestId
 * Server-Sent Events endpoint for real-time agent responses
 */
router.get('/stream/:requestId', async (req, res) => {
    const { requestId } = req.params;
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    logger_1.default.info('SSE connection established', { requestId });
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);
    // Set up Kafka consumer for this request
    const consumerGroupId = `sse-${requestId}`;
    try {
        await kafka_1.default.consumeMessages(consumerGroupId, ['user-responses'], async ({ message }) => {
            try {
                const response = JSON.parse(message.value.toString());
                // Only send messages for this requestId
                if (response.requestId === requestId) {
                    res.write(`data: ${JSON.stringify(response)}\n\n`);
                    // Close connection after sending response
                    if (response.status === 'success' || response.status === 'error') {
                        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
                        res.end();
                    }
                }
            }
            catch (error) {
                logger_1.default.error('Error processing SSE message', { error });
            }
        });
    }
    catch (error) {
        logger_1.default.error('SSE error', { requestId, error });
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Connection failed' })}\n\n`);
        res.end();
    }
    // Handle client disconnect
    req.on('close', () => {
        logger_1.default.info('SSE connection closed', { requestId });
    });
});
exports.default = router;
//# sourceMappingURL=agent.routes.js.map