import { Pool, PoolClient } from 'pg';
import logger from './logger';
import { MSETradingHistory, MSECompany, MSETradingStatus } from './types';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

class DatabaseClient {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
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
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info('Disconnected from PostgreSQL');
  }

  /**
   * Insert or update MSE company
   */
  async upsertCompany(company: MSECompany): Promise<void> {
    const query = `
      INSERT INTO mse_companies (
        company_code, symbol, name, market_segment_id, security_type, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (company_code) 
      DO UPDATE SET
        symbol = EXCLUDED.symbol,
        name = EXCLUDED.name,
        market_segment_id = EXCLUDED.market_segment_id,
        security_type = EXCLUDED.security_type,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      company.companycode,
      company.Symbol,
      company.Name,
      company.MarketSegmentID,
      company.securityType
    ]);
  }

  /**
   * Insert MSE trading history record
   */
  async insertTradingHistory(record: MSETradingHistory): Promise<void> {
    const query = `
      INSERT INTO mse_trading_history (
        symbol, name, opening_price, closing_price, high_price, low_price,
        volume, previous_close, turnover, md_entry_time, company_code,
        market_segment_id, security_type, trade_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (symbol, trade_date) DO NOTHING
    `;

    await this.pool.query(query, [
      record.Symbol,
      record.Name,
      record.OpeningPrice,
      record.ClosingPrice,
      record.HighPrice,
      record.LowPrice,
      record.Volume,
      record.PreviousClose,
      record.Turnover,
      record.MDEntryTime,
      record.companycode,
      record.MarketSegmentID,
      record.securityType,
      record.dates
    ]);
  }

  /**
   * Batch insert trading history
   */
  async batchInsertTradingHistory(records: MSETradingHistory[]): Promise<void> {
    if (records.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const record of records) {
        await this.insertTradingHistory(record);
      }

      await client.query('COMMIT');
      logger.info(`Inserted ${records.length} trading history records`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to batch insert trading history', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update or insert trading status (real-time)
   */
  async upsertTradingStatus(status: MSETradingStatus): Promise<void> {
    const changePercent = status.PreviousClose > 0 
      ? ((status.ClosingPrice - status.PreviousClose) / status.PreviousClose) * 100
      : 0;

    const query = `
      INSERT INTO mse_trading_status (
        symbol, name, current_price, opening_price, high_price, low_price,
        volume, previous_close, turnover, change_percent, last_trade_time,
        company_code, market_segment_id, security_type, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (symbol)
      DO UPDATE SET
        name = EXCLUDED.name,
        current_price = EXCLUDED.current_price,
        opening_price = EXCLUDED.opening_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        volume = EXCLUDED.volume,
        previous_close = EXCLUDED.previous_close,
        turnover = EXCLUDED.turnover,
        change_percent = EXCLUDED.change_percent,
        last_trade_time = EXCLUDED.last_trade_time,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      status.Symbol,
      status.Name,
      status.ClosingPrice, // Use as current_price
      status.OpeningPrice,
      status.HighPrice,
      status.LowPrice,
      status.Volume,
      status.PreviousClose,
      status.Turnover,
      changePercent,
      status.MDEntryTime,
      status.companycode,
      status.MarketSegmentID,
      status.securityType
    ]);
  }

  /**
   * Get latest trading date
   */
  async getLatestTradingDate(): Promise<Date | null> {
    const result = await this.pool.query(`
      SELECT MAX(trade_date) as latest_date
      FROM mse_trading_history
    `);

    return result.rows[0]?.latest_date || null;
  }

  /**
   * Get all company codes
   */
  async getAllCompanyCodes(): Promise<number[]> {
    const result = await this.pool.query(`
      SELECT company_code
      FROM mse_companies
      ORDER BY company_code
    `);

    return result.rows.map(row => row.company_code);
  }
}

export default new DatabaseClient();

