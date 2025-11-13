import { Router, Request, Response } from 'express';
import kafkaService from '../services/kafka';
import logger from '../services/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'thesis-demo-secret-change-in-production';

// Middleware to extract userId from token (optional)
function getUserId(req: Request): string {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded.userId?.toString() || 'guest';
    } catch (error) {
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
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, type, context } = req.body;
    const userId = getUserId(req);
    const requestId = uuidv4();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    // Send to user.requests topic (new architecture)
    await kafkaService.sendEvent('user.requests', requestId, {
      requestId,
      userId,
      timestamp: new Date().toISOString(),
      query,
      type: type || undefined, // 'portfolio', 'news', 'market', 'risk', etc.
      context: context || {},
    });

    logger.info('User query sent to orchestrator', { requestId, userId, type });

    res.json({
      success: true,
      requestId,
      message: 'Query submitted successfully',
    });
  } catch (error) {
    logger.error('Agent query error', { error });
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
router.get('/response/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const db = require('../services/database').default;
    
    // Check database for cached response
    const result = await db.query(
      `SELECT request_id, agent_type, query, response, status, processing_time_ms, created_at
       FROM agent_responses_cache
       WHERE request_id = $1`,
      [requestId]
    );
    
    if (result.rows.length > 0) {
      const cachedResponse = result.rows[0];
      
      return res.json({
        success: true,
        found: true,
        requestId: cachedResponse.request_id,
        agentType: cachedResponse.agent_type,
        query: cachedResponse.query,
        response: cachedResponse.response,
        status: cachedResponse.status,
        processingTimeMs: cachedResponse.processing_time_ms,
        completedAt: cachedResponse.created_at,
      });
    }
    
    // Response not found yet (still processing or doesn't exist)
    res.json({
      success: true,
      found: false,
      message: 'Response not ready yet. Try again in a few seconds.',
      requestId,
      sseEndpoint: `/api/agent/stream/${requestId}`,
    });
  } catch (error) {
    logger.error('Get response error', { error });
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
router.get('/stream/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);

  // Start consuming agent.responses topic for this requestId
  const consumer = kafkaService.getConsumer(`sse-${requestId}`);
  
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'agent.responses', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }: { message: any }) => {
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
        } catch (error) {
          logger.error('SSE message processing error:', error);
        }
      },
    });
  } catch (error) {
    logger.error('SSE stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
    res.end();
  }

  // Cleanup on client disconnect
  req.on('close', async () => {
    try {
      await consumer.disconnect();
    } catch (error) {
      logger.error('Error disconnecting SSE consumer:', error);
    }
    res.end();
  });
});

/**
 * POST /api/agent/portfolio/advice (Legacy compatibility)
 * Redirects to unified /query endpoint
 */
router.post('/portfolio/advice', async (req: Request, res: Response) => {
  try {
    const { userId, investmentAmount, riskTolerance, preferences } = req.body;
    const requestId = uuidv4();

    await kafkaService.sendEvent('user.requests', requestId, {
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

    logger.info('Portfolio advice request sent', { requestId });

    res.json({
      success: true,
      requestId,
      message: 'Processing portfolio advice request',
    });
  } catch (error) {
    logger.error('Portfolio advice error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process portfolio advice request',
    });
  }
});

/**
 * POST /api/agent/news/latest (Legacy compatibility)
 */
router.post('/news/latest', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    const userId = getUserId(req);
    const requestId = uuidv4();

    await kafkaService.sendEvent('user.requests', requestId, {
      requestId,
      userId,
      timestamp: new Date().toISOString(),
      query: `Get latest news for ${symbols?.join(', ') || 'my watchlist'}`,
      type: 'news',
      context: {
        symbols,
      },
    });

    logger.info('News request sent', { requestId });

    res.json({
      success: true,
      requestId,
      message: 'Processing news request',
    });
  } catch (error) {
    logger.error('News request error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process news request',
    });
  }
});

export default router;
