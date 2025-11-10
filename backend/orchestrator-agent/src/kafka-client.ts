import { Kafka, Consumer, Producer } from 'kafkajs';
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
      clientId: 'orchestrator-agent',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'orchestrator-group',
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
      logger.info('✅ Connected to Kafka');
    } catch (error: any) {
      logger.error('Failed to connect to Kafka', { error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to topics (new architecture)
   */
  async subscribe(topics: string[]): Promise<void> {
    try {
      await this.consumer.subscribe({
        topics,
        fromBeginning: false
      });
      
      logger.info(`✅ Subscribed to topics: ${topics.join(', ')}`);
    } catch (error: any) {
      logger.error('Failed to subscribe to topics', { error: error.message });
      throw error;
    }
  }

  /**
   * Start consuming messages (updated for new architecture)
   */
  async startConsuming(
    messageHandler: (topic: string, message: any) => Promise<void>
  ): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const payload = JSON.parse(message.value?.toString() || '{}');
            logger.debug(`📨 Received message from ${topic}`, { 
              partition, 
              offset: message.offset 
            });
            
            await messageHandler(topic, payload);
          } catch (error: any) {
            logger.error('Error processing message', { 
              error: error.message,
              topic,
              partition,
              offset: message.offset
            });
          }
        }
      });
      
      logger.info('✅ Started consuming messages');
    } catch (error: any) {
      logger.error('Failed to start consuming', { error: error.message });
      throw error;
    }
  }

  /**
   * Send event to topic (generic method)
   */
  async sendEvent(topic: string, key: string, message: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      });
      
      logger.debug(`✉️  Sent message to ${topic}`, { key });
    } catch (error: any) {
      logger.error('Failed to send message', { 
        error: error.message, 
        topic 
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
