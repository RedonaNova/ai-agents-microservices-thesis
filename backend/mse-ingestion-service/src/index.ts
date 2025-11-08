import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import database from './database';
import kafkaProducer from './kafka-producer';
import mseApiClient from './api-client';
import { MSETradingHistory } from './types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

class MSEIngestionService {
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    logger.info('Starting MSE Ingestion Service...');

    try {
      // Connect to services
      await database.connect();
      await kafkaProducer.connect();

      // Check if MSE API is available
      const apiAvailable = await mseApiClient.isAvailable();
      
      if (apiAvailable) {
        logger.info('MSE API is available');
        // Start real-time polling
        await this.startRealtimePolling();
      } else {
        logger.warn('MSE API not available. You can manually load data using loadFromFile()');
        logger.info('Service is waiting for manual data ingestion...');
      }

      this.isRunning = true;
      logger.info('✓ MSE Ingestion Service started successfully');

      // Publish monitoring event
      await kafkaProducer.publishMonitoringEvent({
        type: 'service_started',
        message: 'MSE Ingestion Service started',
        metadata: { apiAvailable }
      });

    } catch (error) {
      logger.error('Failed to start MSE Ingestion Service', { error });
      await this.stop();
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping MSE Ingestion Service...');
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    await kafkaProducer.disconnect();
    await database.disconnect();

    logger.info('✓ MSE Ingestion Service stopped');
  }

  /**
   * Start real-time polling from MSE API
   */
  private async startRealtimePolling(): Promise<void> {
    const intervalMs = parseInt(process.env.MSE_POLLING_INTERVAL_MS || '60000'); // 1 minute default

    logger.info(`Starting real-time polling (interval: ${intervalMs}ms)`);

    // Initial fetch
    await this.fetchAndIngest();

    // Set up polling
    this.pollingInterval = setInterval(async () => {
      await this.fetchAndIngest();
    }, intervalMs);
  }

  /**
   * Fetch data from MSE API and ingest
   */
  private async fetchAndIngest(): Promise<void> {
    try {
      logger.info('Fetching data from MSE API...');

      // Fetch trading status (real-time)
      const tradingStatus = await mseApiClient.fetchTradingStatus();
      
      for (const status of tradingStatus) {
        await database.upsertTradingStatus(status);
      }

      logger.info(`✓ Processed ${tradingStatus.length} real-time trading status updates`);

      // Fetch today's trading history
      const today = new Date().toISOString().split('T')[0];
      const tradingHistory = await mseApiClient.fetchTradingHistory(today);

      if (tradingHistory.length > 0) {
        await this.processAndIngestBatch(tradingHistory);
      }

    } catch (error) {
      logger.error('Error in fetchAndIngest', { error });
    }
  }

  /**
   * Process and ingest a batch of trading history records
   */
  private async processAndIngestBatch(records: MSETradingHistory[]): Promise<void> {
    try {
      // 1. Insert into PostgreSQL
      await database.batchInsertTradingHistory(records);

      // 2. Publish to Kafka
      await kafkaProducer.publishStockUpdatesBatch(records);

      logger.info(`✓ Successfully processed ${records.length} trading records`);

      // 3. Publish monitoring event
      await kafkaProducer.publishMonitoringEvent({
        type: 'data_ingested',
        message: `Ingested ${records.length} trading records`,
        metadata: {
          count: records.length,
          date: records[0]?.dates
        }
      });

    } catch (error) {
      logger.error('Failed to process batch', { error });
      throw error;
    }
  }

  /**
   * Load data from a JSON file
   * Usage: loadFromFile('/path/to/mse-data.json')
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      logger.info(`Loading MSE data from file: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      let records: MSETradingHistory[];
      
      if (Array.isArray(data)) {
        records = mseApiClient.parseFromArray(data);
      } else if (data.data && Array.isArray(data.data)) {
        records = mseApiClient.parseFromArray(data.data);
      } else {
        throw new Error('Invalid data format. Expected array or {data: array}');
      }

      logger.info(`Parsed ${records.length} records from file`);

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await this.processAndIngestBatch(batch);
        logger.info(`Progress: ${Math.min(i + batchSize, records.length)}/${records.length}`);
      }

      logger.info('✓ File loading complete');

    } catch (error) {
      logger.error('Failed to load from file', { error });
      throw error;
    }
  }

  /**
   * Load historical data for a date range
   */
  async loadHistoricalData(startDate: string, endDate: string): Promise<void> {
    try {
      logger.info(`Loading historical data from ${startDate} to ${endDate}`);

      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentDate = new Date(start);

      let totalRecords = 0;

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        logger.info(`Fetching data for ${dateStr}...`);

        const records = await mseApiClient.fetchTradingHistory(dateStr);
        
        if (records.length > 0) {
          await this.processAndIngestBatch(records);
          totalRecords += records.length;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info(`✓ Historical data loading complete. Total records: ${totalRecords}`);

    } catch (error) {
      logger.error('Failed to load historical data', { error });
      throw error;
    }
  }
}

// Create service instance
const service = new MSEIngestionService();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await service.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await service.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  service.stop().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  service.stop().then(() => process.exit(1));
});

// Start the service
service.start().catch((error) => {
  logger.error('Failed to start service', { error });
  process.exit(1);
});

// Export for programmatic use
export default service;

