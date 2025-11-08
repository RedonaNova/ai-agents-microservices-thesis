/**
 * Kafka Client for Investment Agent
 */

import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import logger from './logger';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const GROUP_ID = 'investment-agent-group';

// Topics this agent subscribes to
const INVESTMENT_TOPICS = [
  'portfolio-requests',
  'market-analysis-requests',
  'historical-analysis-requests',
  'risk-assessment-requests'
];

const RESPONSE_TOPIC = 'user-responses';

class KafkaClient {
  private kafka: Kafka;
  private consumer: Consumer | null = null;
  private producer: Producer | null = null;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'investment-agent',
      brokers: [KAFKA_BROKER],
    });
  }

  async connect(): Promise<void> {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      logger.info('Kafka producer connected');

      this.consumer = this.kafka.consumer({ groupId: GROUP_ID });
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      await this.consumer.subscribe({ topics: INVESTMENT_TOPICS, fromBeginning: false });
      logger.info('Subscribed to investment topics', { topics: INVESTMENT_TOPICS });
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  async startConsuming(messageHandler: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    await this.consumer.run({
      eachMessage: messageHandler,
    });

    logger.info('Investment Agent started consuming messages');
  }

  async sendResponse(key: string, response: any): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    try {
      await this.producer.send({
        topic: RESPONSE_TOPIC,
        messages: [
          {
            key,
            value: JSON.stringify(response),
          },
        ],
      });

      logger.info('Response sent', { key, topic: RESPONSE_TOPIC });
    } catch (error) {
      logger.error('Failed to send response', { error, key });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    }

    if (this.producer) {
      await this.producer.disconnect();
      logger.info('Kafka producer disconnected');
    }
  }
}

export default new KafkaClient();

