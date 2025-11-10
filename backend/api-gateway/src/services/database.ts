import { Pool, PoolClient } from 'pg';
import logger from './logger';

class DatabaseService {
  private pool: Pool;
  private connected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'thesis_user',
      password: process.env.DB_PASSWORD || 'thesis_pass',
      database: process.env.DB_NAME || 'thesis_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('✅ PostgreSQL connected successfully');
      client.release();
      this.connected = true;
    } catch (error) {
      logger.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
      logger.info('PostgreSQL disconnected');
    } catch (error) {
      logger.error('Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`, { text, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }
}

const db = new DatabaseService();

export default db;

