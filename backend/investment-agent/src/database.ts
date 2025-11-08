/**
 * Database Client for Investment Agent
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import logger from './logger';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://thesis_user:thesis_pass@localhost:5432/thesis_db';

class DatabaseClient {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('Connected to PostgreSQL database');
      client.release();
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    try {
      const result: QueryResult = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query error', { error, query: text });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.pool.end();
      logger.info('Disconnected from PostgreSQL database');
      this.isConnected = false;
    }
  }
}

export default new DatabaseClient();

