import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config';
import logger from './logger';

class KafkaService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private responseHandlers: Map<string, (response: any) => void> = new Map();
  private responseConsumerStarted: boolean = false;

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

  /**
   * Subscribe to a specific response by requestId
   */
  subscribeToResponse(requestId: string, handler: (response: any) => void): void {
    this.responseHandlers.set(requestId, handler);
    
    // Start response consumer if not already started
    if (!this.responseConsumerStarted) {
      this.startResponseConsumer();
    }
  }

  /**
   * Start consuming responses from rag-responses topic
   */
  private async startResponseConsumer(): Promise<void> {
    if (this.responseConsumerStarted) return;
    
    this.responseConsumerStarted = true;
    
    try {
      const consumer = await this.createConsumer('api-gateway-rag-responses', ['rag-responses']);
      
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            if (!message.value) return;
            
            const response = JSON.parse(message.value.toString());
            const requestId = response.requestId;
            
            if (requestId && this.responseHandlers.has(requestId)) {
              const handler = this.responseHandlers.get(requestId);
              if (handler) {
                handler(response);
                this.responseHandlers.delete(requestId); // Clean up after handling
              }
            }
          } catch (error) {
            logger.error('Error processing RAG response', { error });
          }
        }
      });
      
      logger.info('RAG response consumer started');
    } catch (error) {
      logger.error('Failed to start RAG response consumer', { error });
      this.responseConsumerStarted = false;
    }
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

  getKafkaInstance(): Kafka {
    return this.kafka;
  }

  getConsumer(groupId: string): Consumer {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({ groupId });
      this.consumers.set(groupId, consumer);
    }
    return this.consumers.get(groupId)!;
  }
}

export default new KafkaService();

