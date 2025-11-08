import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import logger from './logger';
import { StockUpdateMessage, MSETradingHistory } from './types';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

class KafkaProducerClient {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'mse-ingestion-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Connected to Kafka');
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    this.isConnected = false;
    logger.info('Disconnected from Kafka');
  }

  /**
   * Publish MSE stock update to Kafka
   */
  async publishStockUpdate(record: MSETradingHistory): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    const message: StockUpdateMessage = {
      symbol: record.Symbol,
      price: record.ClosingPrice,
      volume: record.Volume,
      timestamp: new Date(record.MDEntryTime).getTime(),
      market: 'MSE',
      metadata: {
        high: record.HighPrice,
        low: record.LowPrice,
        open: record.OpeningPrice,
        previousClose: record.PreviousClose,
        changePercent: record.PreviousClose > 0 
          ? ((record.ClosingPrice - record.PreviousClose) / record.PreviousClose) * 100
          : 0
      }
    };

    await this.producer.send({
      topic: 'mse-stock-updates',
      messages: [
        {
          key: record.Symbol,
          value: JSON.stringify(message),
          timestamp: message.timestamp.toString()
        }
      ]
    });
  }

  /**
   * Publish batch of stock updates
   */
  async publishStockUpdatesBatch(records: MSETradingHistory[]): Promise<void> {
    if (!this.isConnected || records.length === 0) {
      return;
    }

    const messages = records.map(record => {
      const message: StockUpdateMessage = {
        symbol: record.Symbol,
        price: record.ClosingPrice,
        volume: record.Volume,
        timestamp: new Date(record.MDEntryTime).getTime(),
        market: 'MSE',
        metadata: {
          high: record.HighPrice,
          low: record.LowPrice,
          open: record.OpeningPrice,
          previousClose: record.PreviousClose,
          changePercent: record.PreviousClose > 0 
            ? ((record.ClosingPrice - record.PreviousClose) / record.PreviousClose) * 100
            : 0
        }
      };

      return {
        key: record.Symbol,
        value: JSON.stringify(message),
        timestamp: message.timestamp.toString()
      };
    });

    await this.producer.send({
      topic: 'mse-stock-updates',
      messages
    });

    logger.info(`Published ${messages.length} stock updates to Kafka`);
  }

  /**
   * Publish trading history to dedicated topic
   */
  async publishTradingHistory(record: MSETradingHistory): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    await this.producer.send({
      topic: 'mse-trading-history',
      messages: [
        {
          key: record.Symbol,
          value: JSON.stringify(record),
          timestamp: new Date(record.dates).getTime().toString()
        }
      ]
    });
  }

  /**
   * Publish system monitoring event
   */
  async publishMonitoringEvent(event: {
    type: string;
    message: string;
    metadata?: any;
  }): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.producer.send({
        topic: 'monitoring-events',
        messages: [
          {
            value: JSON.stringify({
              ...event,
              service: 'mse-ingestion',
              timestamp: Date.now()
            })
          }
        ]
      });
    } catch (error) {
      // Don't throw on monitoring events
      logger.warn('Failed to publish monitoring event', { error });
    }
  }
}

export default new KafkaProducerClient();

