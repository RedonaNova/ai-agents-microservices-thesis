"use server";

import { Pool } from 'pg';

export interface MSEStock {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  tradingDate?: string;
  description?: string;
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
 * Search MSE stocks by symbol or name (prefix matching)
 * Works with both English symbols (APU-O-0000) and Mongolian names (АПУ)
 */
export async function searchMSEStocks(query: string): Promise<MSEStock[]> {
  try {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim();
    const pool = getPool();

    // Search by symbol (starts with) OR name (contains)
    // Using ILIKE for case-insensitive search
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
      LEFT JOIN mse_trading_history th ON c.symbol = th.symbol
      WHERE 
        c.symbol ILIKE $1 OR 
        c.name ILIKE $2
      ORDER BY c.symbol, th.trade_date DESC NULLS LAST
      LIMIT 10
      `,
      [`${searchTerm}%`, `%${searchTerm}%`] // Starts with for symbol, contains for name
    );

    return result.rows.map((row: any) => ({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      closingPrice: row.closing_price ? parseFloat(row.closing_price) : undefined,
      change: row.change ? parseFloat(row.change) : undefined,
      changePercent: row.change_percent ? parseFloat(row.change_percent) : undefined,
      volume: row.volume ? parseInt(row.volume) : undefined,
      tradingDate: row.trade_date,
    }));
  } catch (error) {
    console.error('MSE search error:', error);
    return [];
  }
}

/**
 * Get all MSE stocks (for initial display)
 */
export async function getAllMSEStocks(limit: number = 20): Promise<MSEStock[]> {
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
      LEFT JOIN mse_trading_history th ON c.symbol = th.symbol
      ORDER BY c.symbol, th.trade_date DESC NULLS LAST
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row: any) => ({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      closingPrice: row.closing_price ? parseFloat(row.closing_price) : undefined,
      change: row.change ? parseFloat(row.change) : undefined,
      changePercent: row.change_percent ? parseFloat(row.change_percent) : undefined,
      volume: row.volume ? parseInt(row.volume) : undefined,
      tradingDate: row.trade_date,
    }));
  } catch (error) {
    console.error('Get all MSE stocks error:', error);
    return [];
  }
}

/**
 * Search MSE stocks with RAG for complex queries (optional, for future use)
 */
export async function searchMSEWithRAG(query: string): Promise<MSEStock[]> {
  try {
    const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001';
    
    const response = await fetch(`${API_GATEWAY_URL}/api/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: Date.now().toString(),
        userId: 'search-user',
        query: query.trim(),
        language: 'mongolian',
        topK: 10,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('RAG query failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.success && data.data && Array.isArray(data.data.sources)) {
      return data.data.sources.map((source: any) => ({
        symbol: source.symbol,
        name: source.name,
        sector: source.sector,
        closingPrice: source.closingPrice,
        change: source.change,
        changePercent: source.changePercent,
        volume: source.volume,
        tradingDate: source.tradingDate,
        description: data.data.answer,
      }));
    }

    return [];
  } catch (error) {
    console.error('RAG search error:', error);
    return [];
  }
}
