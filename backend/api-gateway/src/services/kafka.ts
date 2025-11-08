import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config';
import logger from './logger';

class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: [config.kafkaBroker],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
  }

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      logger.info('Kafka producer connected');
    }
    return this.producer;
  }

  async sendEvent(topic: string, key: string, value: any): Promise<void> {
    try {
      const producer = await this.getProducer();
      await producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(value)
        }]
      });
      logger.info(`Event sent to ${topic}`, { key });
    } catch (error) {
      logger.error('Failed to send Kafka event', { topic, error });
      throw error;
    }
  }

  async createConsumer(groupId: string, topics: string[]): Promise<Consumer> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topics, fromBeginning: false });
    this.consumers.set(groupId, consumer);
    logger.info(`Kafka consumer created for ${groupId}`, { topics });
    return consumer;
  }

  async consumeMessages(
    groupId: string,
    topics: string[],
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    const consumer = await this.createConsumer(groupId, topics);
    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await handler(payload);
        } catch (error) {
          logger.error('Error processing Kafka message', { error, topic: payload.topic });
        }
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      logger.info('Kafka producer disconnected');
    }
    for (const [groupId, consumer] of this.consumers) {
      await consumer.disconnect();
      logger.info(`Kafka consumer ${groupId} disconnected`);
    }
  }
}

export default new KafkaService();

