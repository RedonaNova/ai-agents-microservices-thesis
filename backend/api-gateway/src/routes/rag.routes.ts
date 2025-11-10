import { Router, Request, Response } from 'express';
import kafkaService from '../services/kafka';
import logger from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/rag/query
 * Query RAG service for Mongolian responses
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, query, language, topK } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const requestId = uuidv4();

    // Create a promise to wait for RAG response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('RAG query timeout'));
      }, 30000); // 30 second timeout

      // Subscribe to response
      kafkaService.subscribeToResponse(requestId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    // Send query to RAG service
    await kafkaService.sendEvent('rag-queries', requestId, {
      requestId,
      userId: userId || 'guest',
      query,
      language: language || 'mongolian',
      metadata: {
        topK: topK || 5,
      },
      timestamp: new Date().toISOString(),
    });

    logger.info('RAG query sent', { requestId, query: query.substring(0, 50) });

    // Wait for response
    const response: any = await responsePromise;

    if (response.status === 'completed') {
      res.json({
        success: true,
        requestId,
        data: response.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error || 'RAG query failed',
      });
    }
  } catch (error) {
    logger.error('RAG query error', { error });
    res.status(500).json({ 
      success: false,
      error: 'Failed to process RAG query' 
    });
  }
});

export default router;

