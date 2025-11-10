"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kafka_1 = __importDefault(require("../services/kafka"));
const database_1 = __importDefault(require("../services/database"));
const logger_1 = __importDefault(require("../services/logger"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
/**
 * GET /api/news
 * Get news using News Intelligence Agent
 * Optionally filtered by user's watchlist
 */
router.get('/', async (req, res) => {
    try {
        const { userId, symbols } = req.query;
        const requestId = (0, uuid_1.v4)();
        // Get watchlist symbols if userId provided
        let watchlistSymbols = [];
        if (userId) {
            try {
                const result = await database_1.default.query('SELECT wi.symbol FROM watchlist_items wi JOIN watchlists w ON wi.watchlist_id = w.id WHERE w.user_id = $1', [userId]);
                watchlistSymbols = result.rows.map((item) => item.symbol);
            }
            catch (error) {
                logger_1.default.warn('Failed to fetch watchlist', { userId, error });
            }
        }
        // Use provided symbols or watchlist symbols
        const targetSymbols = symbols
            ? (Array.isArray(symbols) ? symbols : [symbols])
            : watchlistSymbols;
        // Send request to News Intelligence Agent
        await kafka_1.default.sendEvent('news-events', requestId, {
            requestId,
            userId: userId || 'guest',
            intent: 'news_query',
            message: 'Get latest news',
            metadata: {
                symbols: targetSymbols,
                timeframe: '24h'
            },
            timestamp: new Date().toISOString()
        });
        logger_1.default.info('News request sent to agent', { requestId, symbols: targetSymbols });
        // For now, return requestId for SSE polling
        res.json({
            success: true,
            requestId,
            message: 'News request processing. Check /api/agent/stream/{requestId} for results.'
        });
    }
    catch (error) {
        logger_1.default.error('News request error', { error });
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});
exports.default = router;
//# sourceMappingURL=news.routes.js.map