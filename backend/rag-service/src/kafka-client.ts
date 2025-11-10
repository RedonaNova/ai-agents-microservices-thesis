import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import logger from './logger';
import { KafkaMessage } from './types';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const INPUT_TOPIC = 'rag-queries';
const OUTPUT_TOPIC = 'rag-responses';

class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'rag-service',
      brokers: [KAFKA_BROKER],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'rag-service-group' });
  }

  async connect() {
    try {
      await this.producer.connect();
      logger.info('Kafka producer connected');

      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      await this.consumer.subscribe({ topic: INPUT_TOPIC, fromBeginning: false });
      logger.info('Subscribed to topic', { topic: INPUT_TOPIC });
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  async sendResponse(requestId: string, data: any) {
    try {
      await this.producer.send({
        topic: OUTPUT_TOPIC,
        messages: [
          {
            key: requestId,
            value: JSON.stringify(data),
          },
        ],
      });
      logger.info('Response sent', { requestId, topic: OUTPUT_TOPIC });
    } catch (error) {
      logger.error('Failed to send response', { error, requestId });
    }
  }

  async startConsuming(messageHandler: (message: KafkaMessage) => Promise<void>) {
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            if (!message.value) return;

            const data: KafkaMessage = JSON.parse(message.value.toString());
            logger.info('Received message', {
              topic,
              partition,
              requestId: data.requestId,
              type: data.type,
            });

            await messageHandler(data);
          } catch (error) {
            logger.error('Error processing message', { error, topic, partition });
          }
        },
      });
      logger.info('Started consuming messages');
    } catch (error) {
      logger.error('Failed to start consuming', { error });
      throw error;
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    logger.info('Kafka client disconnected');
  }
}

export default new KafkaClient();

