import { Router, Request, Response } from 'express';
import kafkaService from '../services/kafka';
import logger from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/agent/portfolio/advice
 * Get investment recommendations from Portfolio Advisor Agent
 */
router.post('/portfolio/advice', async (req: Request, res: Response) => {
  try {
    const { userId, investmentAmount, riskTolerance, preferences } = req.body;
    const requestId = uuidv4();

    // Route to consolidated Investment Agent
    await kafkaService.sendEvent('portfolio-requests', requestId, {
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

    logger.info('Portfolio advice request sent (consolidated)', { requestId, userId });

    res.json({
      success: true,
      requestId,
      message: 'Processing portfolio advice request'
    });
  } catch (error) {
    logger.error('Portfolio advice error', { error });
    res.status(500).json({ error: 'Failed to process portfolio advice request' });
  }
});

/**
 * POST /api/agent/market/analyze
 * Get market analysis from Market Analysis Agent
 */
router.post('/market/analyze', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const requestId = uuidv4();

    // Route to consolidated Investment Agent
    await kafkaService.sendEvent('market-analysis-requests', requestId, {
      requestId,
      userId: userId || 'guest',
      type: 'market_analysis',
      message: 'Analyze current market trends',
      timestamp: new Date().toISOString()
    });

    logger.info('Market analysis request sent (consolidated)', { requestId });

    res.json({
      success: true,
      requestId,
      message: 'Processing market analysis request'
    });
  } catch (error) {
    logger.error('Market analysis error', { error });
    res.status(500).json({ error: 'Failed to process market analysis request' });
  }
});

/**
 * POST /api/agent/historical/analyze
 * Get technical analysis from Historical Analysis Agent
 */
router.post('/historical/analyze', async (req: Request, res: Response) => {
  try {
    const { userId, symbol, period } = req.body;
    const requestId = uuidv4();

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Route to consolidated Investment Agent
    await kafkaService.sendEvent('historical-analysis-requests', requestId, {
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

    logger.info('Historical analysis request sent (consolidated)', { requestId, symbol });

    res.json({
      success: true,
      requestId,
      message: 'Processing historical analysis request'
    });
  } catch (error) {
    logger.error('Historical analysis error', { error });
    res.status(500).json({ error: 'Failed to process historical analysis request' });
  }
});

/**
 * POST /api/agent/risk/assess
 * Get risk assessment from Risk Assessment Agent
 */
router.post('/risk/assess', async (req: Request, res: Response) => {
  try {
    const { userId, portfolio, symbols, confidenceLevel } = req.body;
    const requestId = uuidv4();

    // Route to consolidated Investment Agent
    await kafkaService.sendEvent('risk-assessment-requests', requestId, {
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

    logger.info('Risk assessment request sent (consolidated)', { requestId });

    res.json({
      success: true,
      requestId,
      message: 'Processing risk assessment request'
    });
  } catch (error) {
    logger.error('Risk assessment error', { error });
    res.status(500).json({ error: 'Failed to process risk assessment request' });
  }
});

/**
 * GET /api/agent/stream/:requestId
 * Server-Sent Events endpoint for real-time agent responses
 */
router.get('/stream/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  logger.info('SSE connection established', { requestId });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);

  // Set up Kafka consumer for this request
  const consumerGroupId = `sse-${requestId}`;
  
  try {
    await kafkaService.consumeMessages(
      consumerGroupId,
      ['user-responses'],
      async ({ message }) => {
        try {
          const response = JSON.parse(message.value!.toString());
          
          // Only send messages for this requestId
          if (response.requestId === requestId) {
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            
            // Close connection after sending response
            if (response.status === 'success' || response.status === 'error') {
              res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
              res.end();
            }
          }
        } catch (error) {
          logger.error('Error processing SSE message', { error });
        }
      }
    );
  } catch (error) {
    logger.error('SSE error', { requestId, error });
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Connection failed' })}\n\n`);
    res.end();
  }

  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE connection closed', { requestId });
  });
});

export default router;

