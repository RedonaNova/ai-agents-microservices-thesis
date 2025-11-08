import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import logger from './logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

class KafkaClient {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'market-analysis-agent',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 100, retries: 8 }
    });
    this.consumer = this.kafka.consumer({ groupId: 'market-analysis-group' });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await Promise.all([this.consumer.connect(), this.producer.connect()]);
    this.isConnected = true;
    logger.info('Connected to Kafka');
  }

  async subscribe(): Promise<void> {
    await this.consumer.subscribe({ topics: ['market-analysis-events'], fromBeginning: false });
    logger.info('Subscribed to market-analysis-events topic');
  }

  async startConsuming(handler: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    await this.consumer.run({ eachMessage: handler });
    logger.info('Started consuming messages');
  }

  async sendResponse(response: any): Promise<void> {
    await this.producer.send({
      topic: 'user-responses',
      messages: [{ key: response.userId || response.requestId, value: JSON.stringify(response) }]
    });
  }

  async disconnect(): Promise<void> {
    await Promise.all([this.consumer.disconnect(), this.producer.disconnect()]);
    this.isConnected = false;
    logger.info('Disconnected from Kafka');
  }
}

export default new KafkaClient();

