import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import logger from './logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

class KafkaClient {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'portfolio-advisor-agent',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'portfolio-advisor-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000
    });
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.consumer.connect(),
        this.producer.connect()
      ]);
      
      this.isConnected = true;
      logger.info('Connected to Kafka');
    } catch (error: any) {
      logger.error('Failed to connect to Kafka', { error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to portfolio-events topic
   */
  async subscribe(): Promise<void> {
    try {
      await this.consumer.subscribe({
        topics: ['portfolio-events'],
        fromBeginning: false
      });
      
      logger.info('Subscribed to portfolio-events topic');
    } catch (error: any) {
      logger.error('Failed to subscribe to topics', { error: error.message });
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming(messageHandler: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await messageHandler(payload);
          } catch (error: any) {
            logger.error('Error processing message', { 
              error: error.message,
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset
            });
          }
        }
      });
      
      logger.info('Started consuming messages');
    } catch (error: any) {
      logger.error('Failed to start consuming', { error: error.message });
      throw error;
    }
  }

  /**
   * Send response back to user-responses topic
   */
  async sendResponse(response: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka not connected');
    }

    try {
      await this.producer.send({
        topic: 'user-responses',
        messages: [
          {
            key: response.userId || response.requestId,
            value: JSON.stringify(response),
            timestamp: Date.now().toString()
          }
        ]
      });
      
      logger.debug('Response sent', { requestId: response.requestId });
    } catch (error: any) {
      logger.error('Failed to send response', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.consumer.disconnect(),
        this.producer.disconnect()
      ]);
      
      this.isConnected = false;
      logger.info('Disconnected from Kafka');
    } catch (error: any) {
      logger.error('Error disconnecting from Kafka', { error: error.message });
    }
  }
}

// Export singleton instance
export default new KafkaClient();

