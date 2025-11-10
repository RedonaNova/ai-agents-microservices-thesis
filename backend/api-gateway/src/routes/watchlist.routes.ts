import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../services/database';
import kafkaService from '../services/kafka';
import logger from '../services/logger';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'thesis-demo-secret-change-in-production';

/**
 * Middleware to extract userId from JWT
 */
function authenticate(req: Request, res: Response, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}

/**
 * GET /api/watchlist
 * Get all watchlists for user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const result = await db.query(
      `SELECT w.id, w.name, w.created_at, w.updated_at,
              COUNT(wi.id) as item_count
       FROM watchlists w
       LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      watchlists: result.rows,
    });
  } catch (error) {
    logger.error('Get watchlists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get watchlists',
    });
  }
});

/**
 * POST /api/watchlist
 * Create a new watchlist
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name is required',
      });
    }

    const result = await db.query(
      `INSERT INTO watchlists (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at, updated_at`,
      [userId, name]
    );

    // Publish event
    await kafkaService.sendEvent('user.events', userId.toString(), {
      eventId: `event_${Date.now()}_${userId}`,
      eventType: 'watchlist.created',
      userId: userId.toString(),
      data: {
        watchlistId: result.rows[0].id,
        name: result.rows[0].name,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      watchlist: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Watchlist with this name already exists',
      });
    }
    logger.error('Create watchlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create watchlist',
    });
  }
});

/**
 * GET /api/watchlist/:id/items
 * Get all items in a watchlist
 */
router.get('/:id/items', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify ownership
    const watchlistCheck = await db.query(
      'SELECT id FROM watchlists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (watchlistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    const result = await db.query(
      `SELECT id, symbol, is_mse, added_at
       FROM watchlist_items
       WHERE watchlist_id = $1
       ORDER BY added_at DESC`,
      [id]
    );

    res.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    logger.error('Get watchlist items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get watchlist items',
    });
  }
});

/**
 * POST /api/watchlist/:id/items
 * Add item to watchlist
 */
router.post('/:id/items', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { symbol, isMse } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    // Verify ownership
    const watchlistCheck = await db.query(
      'SELECT id FROM watchlists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (watchlistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    const result = await db.query(
      `INSERT INTO watchlist_items (watchlist_id, symbol, is_mse)
       VALUES ($1, $2, $3)
       ON CONFLICT (watchlist_id, symbol) DO NOTHING
       RETURNING id, symbol, is_mse, added_at`,
      [id, symbol.toUpperCase(), isMse || false]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        error: 'Symbol already in watchlist',
      });
    }

    // Update watchlist timestamp
    await db.query(
      'UPDATE watchlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Publish event
    await kafkaService.sendEvent('user.events', userId.toString(), {
      eventId: `event_${Date.now()}_${userId}`,
      eventType: 'watchlist.item.added',
      userId: userId.toString(),
      data: {
        watchlistId: id,
        symbol: symbol.toUpperCase(),
        isMse: isMse || false,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      item: result.rows[0],
    });
  } catch (error) {
    logger.error('Add watchlist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to watchlist',
    });
  }
});

/**
 * DELETE /api/watchlist/:id/items/:symbol
 * Remove item from watchlist
 */
router.delete('/:id/items/:symbol', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id, symbol } = req.params;

    // Verify ownership
    const watchlistCheck = await db.query(
      'SELECT id FROM watchlists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (watchlistCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    await db.query(
      'DELETE FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2',
      [id, symbol.toUpperCase()]
    );

    // Update watchlist timestamp
    await db.query(
      'UPDATE watchlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Publish event
    await kafkaService.sendEvent('user.events', userId.toString(), {
      eventId: `event_${Date.now()}_${userId}`,
      eventType: 'watchlist.item.removed',
      userId: userId.toString(),
      data: {
        watchlistId: id,
        symbol: symbol.toUpperCase(),
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Item removed from watchlist',
    });
  } catch (error) {
    logger.error('Remove watchlist item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from watchlist',
    });
  }
});

/**
 * DELETE /api/watchlist/:id
 * Delete watchlist
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify ownership and delete
    const result = await db.query(
      'DELETE FROM watchlists WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    // Publish event
    await kafkaService.sendEvent('user.events', userId.toString(), {
      eventId: `event_${Date.now()}_${userId}`,
      eventType: 'watchlist.deleted',
      userId: userId.toString(),
      data: {
        watchlistId: id,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Watchlist deleted',
    });
  } catch (error) {
    logger.error('Delete watchlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete watchlist',
    });
  }
});

/**
 * GET /api/watchlist/all/symbols
 * Get all watchlisted symbols for current user (for news fetch)
 */
router.get('/all/symbols', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const result = await db.query(
      `SELECT DISTINCT wi.symbol, wi.is_mse
       FROM watchlist_items wi
       JOIN watchlists w ON wi.watchlist_id = w.id
       WHERE w.user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      symbols: result.rows.map((row: any) => row.symbol),
      symbolsWithType: result.rows,
    });
  } catch (error) {
    logger.error('Get all symbols error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get watchlist symbols',
    });
  }
});

export default router;

