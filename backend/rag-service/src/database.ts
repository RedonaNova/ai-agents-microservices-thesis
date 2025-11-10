import { Pool, PoolClient } from 'pg';
import logger from './logger';
import { CompanyDocument } from './types';

class DatabaseClient {
  private pool: Pool;

  constructor() {
    // Parse DATABASE_URL or use individual env vars
    const dbUrl = process.env.DATABASE_URL;
    
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'thesis_user',
      password: process.env.DB_PASSWORD || 'thesis_pass',
      database: process.env.DB_NAME || 'thesis_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect() {
    try {
      logger.info('Attempting to connect to PostgreSQL...', {
        connectionString: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')
      });
      const client = await this.pool.connect();
      logger.info('Connected to PostgreSQL');
      client.release();
    } catch (error: any) {
      logger.error('Failed to connect to PostgreSQL', { 
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      throw error;
    }
  }

  async getAllCompanies(): Promise<CompanyDocument[]> {
    try {
      const query = `
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
        WHERE th.trade_date IS NOT NULL
        ORDER BY c.symbol, th.trade_date DESC
      `;

      const result = await this.pool.query(query);
      return result.rows.map((row) => ({
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
      logger.error('Failed to fetch companies', { error });
      throw error;
    }
  }

  async getCompanyBySymbol(symbol: string): Promise<CompanyDocument | null> {
    try {
      const query = `
        SELECT 
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
        WHERE c.symbol = $1
        ORDER BY th.trade_date DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [symbol]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        closingPrice: row.closing_price ? parseFloat(row.closing_price) : undefined,
        change: row.change ? parseFloat(row.change) : undefined,
        changePercent: row.change_percent ? parseFloat(row.change_percent) : undefined,
        volume: row.volume ? parseInt(row.volume) : undefined,
        tradingDate: row.trade_date,
      };
    } catch (error) {
      logger.error('Failed to fetch company', { symbol, error });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    logger.info('Database connection closed');
  }
}

export default new DatabaseClient();

