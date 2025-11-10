"use server";

import { Pool } from 'pg';

export interface MSEStockData {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  tradingDate: string;
}

// Database connection
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'thesis_user',
      password: process.env.DB_PASSWORD || 'thesis_pass',
      database: process.env.DB_NAME || 'thesis_db',
      max: 10,
    });
  }
  return pool;
}

/**
 * Fetch MSE stocks from PostgreSQL database
 */
export async function getMSEStocks(limit: number = 20): Promise<MSEStockData[]> {
  try {
    const pool = getPool();

    const result = await pool.query(
      `
      SELECT DISTINCT ON (c.symbol)
        c.symbol,
        c.name,
        c.sector,
        th.closing_price,
        (th.closing_price - th.previous_close) as change,
        ((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100) as change_percent,
        th.volume,
        th.trade_date
      FROM mse_companies c
      INNER JOIN mse_trading_history th ON c.symbol = th.symbol
      WHERE th.closing_price IS NOT NULL
      ORDER BY c.symbol, th.trade_date DESC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector || 'Бусад',
      closingPrice: parseFloat(row.closing_price),
      change: parseFloat(row.change || 0),
      changePercent: parseFloat(row.change_percent || 0),
      volume: parseInt(row.volume || 0),
      tradingDate: row.trade_date,
    }));
  } catch (error) {
    console.error('Error fetching MSE stocks:', error);
    return [];
  }
}

/**
 * Get top movers (gainers and losers)
 */
export async function getTopMovers() {
  try {
    const pool = getPool();

    // Get gainers
    const gainersResult = await pool.query(
      `
      SELECT DISTINCT ON (c.symbol)
        c.symbol,
        c.name,
        c.sector,
        th.closing_price,
        (th.closing_price - th.previous_close) as change,
        ((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100) as change_percent,
        th.volume,
        th.trade_date
      FROM mse_companies c
      INNER JOIN mse_trading_history th ON c.symbol = th.symbol
      WHERE th.closing_price IS NOT NULL
        AND th.previous_close IS NOT NULL
        AND th.closing_price > th.previous_close
      ORDER BY c.symbol, th.trade_date DESC
      LIMIT 50
      `
    );

    const gainers = gainersResult.rows
      .map(row => ({
        symbol: row.symbol,
        name: row.name,
        sector: row.sector || 'Бусад',
        closingPrice: parseFloat(row.closing_price),
        change: parseFloat(row.change),
        changePercent: parseFloat(row.change_percent),
        volume: parseInt(row.volume || 0),
        tradingDate: row.trade_date,
      }))
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    // Get losers
    const losersResult = await pool.query(
      `
      SELECT DISTINCT ON (c.symbol)
        c.symbol,
        c.name,
        c.sector,
        th.closing_price,
        (th.closing_price - th.previous_close) as change,
        ((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100) as change_percent,
        th.volume,
        th.trade_date
      FROM mse_companies c
      INNER JOIN mse_trading_history th ON c.symbol = th.symbol
      WHERE th.closing_price IS NOT NULL
        AND th.previous_close IS NOT NULL
        AND th.closing_price < th.previous_close
      ORDER BY c.symbol, th.trade_date DESC
      LIMIT 50
      `
    );

    const losers = losersResult.rows
      .map(row => ({
        symbol: row.symbol,
        name: row.name,
        sector: row.sector || 'Бусад',
        closingPrice: parseFloat(row.closing_price),
        change: parseFloat(row.change),
        changePercent: parseFloat(row.change_percent),
        volume: parseInt(row.volume || 0),
        tradingDate: row.trade_date,
      }))
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    return { gainers, losers };
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return { gainers: [], losers: [] };
  }
}
