import { Pool } from 'pg';
import logger from './logger';
import { StockData } from './types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

class DatabaseClient {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('Connected to PostgreSQL');
      client.release();
    } catch (error: any) {
      logger.error('Failed to connect to PostgreSQL', { error: error.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info('Disconnected from PostgreSQL');
  }

  /**
   * Generic query method
   */
  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  /**
   * Get latest stock data for a symbol
   */
  async getLatestStockData(symbol: string): Promise<StockData | null> {
    try {
      const query = `
        SELECT 
          symbol,
          name,
          closing_price as "closingPrice",
          opening_price as "openingPrice",
          high_price as "highPrice",
          low_price as "lowPrice",
          volume,
          previous_close as "previousClose",
          (closing_price - previous_close) as change,
          CASE 
            WHEN previous_close > 0 
            THEN ((closing_price - previous_close) / previous_close * 100)
            ELSE 0 
          END as "changePercent",
          trade_date as "tradeDate",
          market_segment_id as "marketSegment"
        FROM mse_trading_history
        WHERE UPPER(symbol) = UPPER($1)
        ORDER BY trade_date DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [symbol]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as StockData;
    } catch (error: any) {
      logger.error('Error fetching stock data', { symbol, error: error.message });
      throw error;
    }
  }

  /**
   * Get multiple stocks data
   */
  async getMultipleStocks(symbols: string[]): Promise<StockData[]> {
    if (symbols.length === 0) return [];

    try {
      const query = `
        WITH latest_dates AS (
          SELECT symbol, MAX(trade_date) as latest_date
          FROM mse_trading_history
          WHERE UPPER(symbol) = ANY($1::text[])
          GROUP BY symbol
        )
        SELECT 
          h.symbol,
          h.name,
          h.closing_price as "closingPrice",
          h.opening_price as "openingPrice",
          h.high_price as "highPrice",
          h.low_price as "lowPrice",
          h.volume,
          h.previous_close as "previousClose",
          (h.closing_price - h.previous_close) as change,
          CASE 
            WHEN h.previous_close > 0 
            THEN ((h.closing_price - h.previous_close) / h.previous_close * 100)
            ELSE 0 
          END as "changePercent",
          h.trade_date as "tradeDate",
          h.market_segment_id as "marketSegment"
        FROM mse_trading_history h
        INNER JOIN latest_dates ld ON h.symbol = ld.symbol AND h.trade_date = ld.latest_date
        ORDER BY h.symbol
      `;

      const upperSymbols = symbols.map(s => s.toUpperCase());
      const result = await this.pool.query(query, [upperSymbols]);
      
      return result.rows as StockData[];
    } catch (error: any) {
      logger.error('Error fetching multiple stocks', { symbols, error: error.message });
      throw error;
    }
  }

  /**
   * Get top performing stocks
   */
  async getTopPerformers(limit: number = 10): Promise<StockData[]> {
    try {
      const query = `
        WITH latest_dates AS (
          SELECT symbol, MAX(trade_date) as latest_date
          FROM mse_trading_history
          GROUP BY symbol
        )
        SELECT 
          h.symbol,
          h.name,
          h.closing_price as "closingPrice",
          h.opening_price as "openingPrice",
          h.high_price as "highPrice",
          h.low_price as "lowPrice",
          h.volume,
          h.previous_close as "previousClose",
          (h.closing_price - h.previous_close) as change,
          CASE 
            WHEN h.previous_close > 0 
            THEN ((h.closing_price - h.previous_close) / h.previous_close * 100)
            ELSE 0 
          END as "changePercent",
          h.trade_date as "tradeDate",
          h.market_segment_id as "marketSegment"
        FROM mse_trading_history h
        INNER JOIN latest_dates ld ON h.symbol = ld.symbol AND h.trade_date = ld.latest_date
        WHERE h.previous_close > 0
        ORDER BY "changePercent" DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);
      return result.rows as StockData[];
    } catch (error: any) {
      logger.error('Error fetching top performers', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available MSE stocks
   */
  async getAvailableStocks(): Promise<{ symbol: string; name: string }[]> {
    try {
      const query = `
        SELECT DISTINCT symbol, name
        FROM mse_companies
        ORDER BY symbol
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error: any) {
      logger.error('Error fetching available stocks', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export default new DatabaseClient();

