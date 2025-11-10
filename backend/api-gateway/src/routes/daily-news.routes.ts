import express, { Request, Response } from 'express';
import db from '../services/database';
import emailService from '../services/email';
import logger from '../services/logger';
import { getNews, getFormattedTodayDate } from '../utils/finnhub';

const router = express.Router();

/**
 * POST /api/daily-news/send
 * Trigger daily news email (can be called via cron or manually)
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    logger.info('Starting daily news email job...');

    // Step 1: Get all users with email
    const usersResult = await db.query(
      'SELECT id, email, name FROM users WHERE email IS NOT NULL'
    );

    const users = usersResult.rows;

    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users found for news delivery',
        sent: 0,
      });
    }

    logger.info(`Found ${users.length} users for news delivery`);

    // Step 2: For each user, get watchlist symbols and fetch news
    const results = [];
    for (const user of users) {
      try {
        // Get user's watchlist symbols
        const watchlistResult = await db.query(
          `SELECT DISTINCT wi.symbol
           FROM watchlist_items wi
           JOIN watchlists w ON wi.watchlist_id = w.id
           WHERE w.user_id = $1`,
          [user.id]
        );

        const symbols = watchlistResult.rows.map((row: any) => row.symbol);

        // Fetch news (personalized if watchlist exists, general otherwise)
        let articles = await getNews(symbols.length > 0 ? symbols : undefined);
        articles = articles.slice(0, 6); // Max 6 articles

        if (articles.length === 0) {
          logger.info(`No news for user ${user.email}, skipping`);
          continue;
        }

        // Send email
        const date = getFormattedTodayDate();
        const success = await emailService.sendNewsSummary(
          user.email,
          articles,
          date
        );

        results.push({
          email: user.email,
          success,
          articleCount: articles.length,
        });

        logger.info(`News email sent to ${user.email}`, {
          success,
          articleCount: articles.length,
        });

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Error sending news to ${user.email}:`, error);
        results.push({
          email: user.email,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Daily news emails sent to ${successCount}/${users.length} users`,
      sent: successCount,
      total: users.length,
      results,
    });
  } catch (error) {
    logger.error('Daily news job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send daily news emails',
    });
  }
});

/**
 * POST /api/daily-news/test
 * Test email for a specific user (for testing)
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Get user
    const userResult = await db.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get watchlist symbols
    const watchlistResult = await db.query(
      `SELECT DISTINCT wi.symbol
       FROM watchlist_items wi
       JOIN watchlists w ON wi.watchlist_id = w.id
       WHERE w.user_id = $1`,
      [user.id]
    );

    const symbols = watchlistResult.rows.map((row: any) => row.symbol);

    // Fetch news
    let articles = await getNews(symbols.length > 0 ? symbols : undefined);
    articles = articles.slice(0, 6);

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No news articles found',
      });
    }

    // Send test email
    const date = getFormattedTodayDate();
    const success = await emailService.sendNewsSummary(
      user.email,
      articles,
      date
    );

    res.json({
      success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email',
      articleCount: articles.length,
      watchlistSymbols: symbols,
    });
  } catch (error) {
    logger.error('Test news email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
    });
  }
});

export default router;

