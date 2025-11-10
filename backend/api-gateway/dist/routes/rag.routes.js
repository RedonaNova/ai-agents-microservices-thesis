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
 * POST /api/rag/query
 * Query RAG service for Mongolian responses
 */
router.post('/query', async (req, res) => {
    try {
        const { userId, query, language, topK } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }
        const requestId = (0, uuid_1.v4)();
        // Create a promise to wait for RAG response
        const responsePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('RAG query timeout'));
            }, 30000); // 30 second timeout
            // Subscribe to response
            kafka_1.default.subscribeToResponse(requestId, (response) => {
                clearTimeout(timeout);
                resolve(response);
            });
        });
        // Send query to RAG service
        await kafka_1.default.sendEvent('rag-queries', requestId, {
            requestId,
            userId: userId || 'guest',
            query,
            language: language || 'mongolian',
            metadata: {
                topK: topK || 5,
            },
            timestamp: new Date().toISOString(),
        });
        logger_1.default.info('RAG query sent', { requestId, query: query.substring(0, 50) });
        // Wait for response
        const response = await responsePromise;
        if (response.status === 'completed') {
            res.json({
                success: true,
                requestId,
                data: response.data,
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: response.error || 'RAG query failed',
            });
        }
    }
    catch (error) {
        logger_1.default.error('RAG query error', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to process RAG query'
        });
    }
});
exports.default = router;
//# sourceMappingURL=rag.routes.js.map