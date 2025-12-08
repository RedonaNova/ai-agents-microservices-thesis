/**
 * MSE (Mongolian Stock Exchange) Data Routes
 * Provides MSE company data and trading history for frontend
 */
import { Router, Request, Response } from 'express';
import db from '../services/database';
import logger from '../services/logger';

const router = Router();

/**
 * GET /api/mse/companies
 * Get all MSE companies
 */
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        company_code, symbol, name, 
        COALESCE(name_en, '') as name_en,
        COALESCE(sector, '') as sector, 
        COALESCE(industry, '') as industry,
        COALESCE(market_segment_id, '') as market_segment_id, 
        COALESCE(security_type, 'CS') as security_type,
        created_at, updated_at
      FROM mse_companies 
      ORDER BY symbol ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      companies: result.rows,
    });
  } catch (error: any) {
    logger.error('Error fetching MSE companies', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
});

/**
 * GET /api/mse/companies/:symbol
 * Get specific company by symbol
 */
router.get('/companies/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    const result = await db.query(`
      SELECT 
        company_code, symbol, name, 
        COALESCE(name_en, '') as name_en,
        COALESCE(sector, '') as sector, 
        COALESCE(industry, '') as industry,
        COALESCE(market_segment_id, '') as market_segment_id, 
        COALESCE(security_type, 'CS') as security_type,
        created_at, updated_at
      FROM mse_companies 
      WHERE symbol = $1 OR symbol = $1 || '-O-0000'
    `, [symbol.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({
      success: true,
      company: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error fetching MSE company', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
});

/**
 * GET /api/mse/trading-status
 * Get current trading status (latest prices) for all stocks
 */
router.get('/trading-status', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        id, symbol, COALESCE(name, '') as name,
        COALESCE(current_price, 0) as current_price, 
        COALESCE(opening_price, 0) as opening_price, 
        COALESCE(high_price, 0) as high_price, 
        COALESCE(low_price, 0) as low_price,
        COALESCE(volume, 0) as volume, 
        COALESCE(turnover, 0) as turnover, 
        COALESCE(change_percent, 0) as change_percent,
        COALESCE(previous_close, 0) as previous_close, 
        last_trade_time, updated_at,
        company_code, 
        COALESCE(market_segment_id, '') as market_segment_id, 
        COALESCE(security_type, 'CS') as security_type
      FROM mse_trading_status
      ORDER BY symbol ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      tradingStatus: result.rows,
    });
  } catch (error: any) {
    logger.error('Error fetching trading status', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trading status' });
  }
});

/**
 * GET /api/mse/trading-status/:symbol
 * Get current trading status for specific stock
 */
router.get('/trading-status/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    // Handle both formats: APU or APU-O-0000
    const symbolWithSuffix = upperSymbol.endsWith('-O-0000') ? upperSymbol : upperSymbol + '-O-0000';
    
    const result = await db.query(`
      SELECT 
        id, symbol, COALESCE(name, '') as name,
        COALESCE(current_price, 0) as current_price, 
        COALESCE(opening_price, 0) as opening_price, 
        COALESCE(high_price, 0) as high_price, 
        COALESCE(low_price, 0) as low_price,
        COALESCE(volume, 0) as volume, 
        COALESCE(turnover, 0) as turnover, 
        COALESCE(change_percent, 0) as change_percent,
        COALESCE(previous_close, 0) as previous_close, 
        last_trade_time, updated_at,
        company_code, 
        COALESCE(market_segment_id, '') as market_segment_id, 
        COALESCE(security_type, 'CS') as security_type
      FROM mse_trading_status
      WHERE symbol = $1 OR symbol = $2
    `, [upperSymbol, symbolWithSuffix]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Trading status not found' });
    }

    res.json({
      success: true,
      tradingStatus: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Error fetching trading status', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trading status' });
  }
});

/**
 * GET /api/mse/history/:symbol
 * Get trading history for specific stock
 * Query params: limit (default 100), from (date), to (date)
 */
router.get('/history/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { limit = '100', from, to } = req.query;
    
    const upperSymbol = symbol.toUpperCase();
    // Handle both formats: APU or APU-O-0000
    const symbolWithSuffix = upperSymbol.endsWith('-O-0000') ? upperSymbol : upperSymbol + '-O-0000';
    
    let query = `
      SELECT 
        id, symbol, COALESCE(name, '') as name, trade_date, 
        COALESCE(closing_price, 0) as closing_price, 
        COALESCE(opening_price, 0) as opening_price, 
        COALESCE(high_price, 0) as high_price, 
        COALESCE(low_price, 0) as low_price,
        COALESCE(volume, 0) as volume, 
        COALESCE(turnover, 0) as turnover, 
        COALESCE(previous_close, 0) as previous_close,
        company_code, 
        COALESCE(market_segment_id, '') as market_segment_id, 
        COALESCE(security_type, 'CS') as security_type, 
        md_entry_time
      FROM mse_trading_history 
      WHERE symbol = $1 OR symbol = $2
    `;
    const params: any[] = [upperSymbol, symbolWithSuffix];
    
    if (from) {
      params.push(from);
      query += ` AND trade_date >= $${params.length}`;
    }
    
    if (to) {
      params.push(to);
      query += ` AND trade_date <= $${params.length}`;
    }
    
    params.push(parseInt(limit as string, 10));
    query += ` ORDER BY trade_date DESC LIMIT $${params.length}`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: result.rows.length,
      history: result.rows,
    });
  } catch (error: any) {
    logger.error('Error fetching trading history', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trading history' });
  }
});

/**
 * GET /api/mse/summary
 * Get market summary (top gainers, losers, most active)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    // Top gainers
    const gainersResult = await db.query(`
      SELECT symbol, 
        COALESCE(name, symbol) as name,
        COALESCE(current_price, 0) as current_price, 
        COALESCE(previous_close, 0) as previous_close,
        COALESCE(change_percent, 0) as change_percent, 
        COALESCE(volume, 0) as volume
      FROM mse_trading_status 
      WHERE change_percent > 0
      ORDER BY change_percent DESC 
      LIMIT 5
    `);

    // Top losers
    const losersResult = await db.query(`
      SELECT symbol, 
        COALESCE(name, symbol) as name,
        COALESCE(current_price, 0) as current_price, 
        COALESCE(previous_close, 0) as previous_close,
        COALESCE(change_percent, 0) as change_percent, 
        COALESCE(volume, 0) as volume
      FROM mse_trading_status 
      WHERE change_percent < 0
      ORDER BY change_percent ASC 
      LIMIT 5
    `);

    // Most active by volume
    const activeResult = await db.query(`
      SELECT symbol, 
        COALESCE(name, symbol) as name,
        COALESCE(current_price, 0) as current_price, 
        COALESCE(previous_close, 0) as previous_close,
        COALESCE(change_percent, 0) as change_percent, 
        COALESCE(volume, 0) as volume
      FROM mse_trading_status 
      WHERE volume > 0
      ORDER BY volume DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      summary: {
        topGainers: gainersResult.rows,
        topLosers: losersResult.rows,
        mostActive: activeResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching market summary', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch market summary' });
  }
});

export default router;

