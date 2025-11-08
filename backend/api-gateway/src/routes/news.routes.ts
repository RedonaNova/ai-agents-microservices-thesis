import { Router, Request, Response } from 'express';
import kafkaService from '../services/kafka';
import mongodb from '../services/mongodb';
import logger from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/news
 * Get news using News Intelligence Agent
 * Optionally filtered by user's watchlist
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, symbols } = req.query;
    const requestId = uuidv4();

    // Get watchlist symbols if userId provided
    let watchlistSymbols: string[] = [];
    if (userId) {
      try {
        const db = mongodb.getConnection().db;
        const user = await db.collection('user').findOne({ id: userId });
        
        if (user) {
          const watchlist = await db.collection('watchlists')
            .find({ userId: userId })
            .toArray();
          watchlistSymbols = watchlist.map((item: any) => item.symbol);
        }
      } catch (error) {
        logger.warn('Failed to fetch watchlist', { userId, error });
      }
    }

    // Use provided symbols or watchlist symbols
    const targetSymbols = symbols 
      ? (Array.isArray(symbols) ? symbols : [symbols])
      : watchlistSymbols;

    // Send request to News Intelligence Agent
    await kafkaService.sendEvent('news-events', requestId, {
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

    logger.info('News request sent to agent', { requestId, symbols: targetSymbols });

    // For now, return requestId for SSE polling
    res.json({
      success: true,
      requestId,
      message: 'News request processing. Check /api/agent/stream/{requestId} for results.'
    });
  } catch (error) {
    logger.error('News request error', { error });
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;

