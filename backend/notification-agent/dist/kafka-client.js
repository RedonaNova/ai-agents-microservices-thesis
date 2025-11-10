"use strict";
/**
 * Kafka Client for Notification Agent
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const logger_1 = __importDefault(require("./logger"));
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const GROUP_ID = 'notification-agent-group';
// Topics this agent subscribes to
const NOTIFICATION_TOPICS = [
    'user-registration-events', // Welcome emails
    'daily-news-trigger' // Daily news job trigger
];
const RESPONSE_TOPIC = 'user-responses';
class KafkaClient {
    constructor() {
        this.consumer = null;
        this.producer = null;
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'notification-agent',
            brokers: [KAFKA_BROKER],
        });
    }
    async connect() {
        try {
            this.producer = this.kafka.producer();
            await this.producer.connect();
            logger_1.default.info('Kafka producer connected');
            this.consumer = this.kafka.consumer({ groupId: GROUP_ID });
            await this.consumer.connect();
            logger_1.default.info('Kafka consumer connected');
            await this.consumer.subscribe({ topics: NOTIFICATION_TOPICS, fromBeginning: false });
            logger_1.default.info('Subscribed to notification topics', { topics: NOTIFICATION_TOPICS });
        }
        catch (error) {
            logger_1.default.error('Failed to connect to Kafka', { error });
            throw error;
        }
    }
    async startConsuming(messageHandler) {
        if (!this.consumer) {
            throw new Error('Consumer not initialized');
        }
        await this.consumer.run({
            eachMessage: messageHandler,
        });
        logger_1.default.info('Notification Agent started consuming messages');
    }
    async sendResponse(key, response) {
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
            logger_1.default.info('Response sent', { key, topic: RESPONSE_TOPIC });
        }
        catch (error) {
            logger_1.default.error('Failed to send response', { error, key });
            throw error;
        }
    }
    async disconnect() {
        if (this.consumer) {
            await this.consumer.disconnect();
            logger_1.default.info('Kafka consumer disconnected');
        }
        if (this.producer) {
            await this.producer.disconnect();
            logger_1.default.info('Kafka producer disconnected');
        }
    }
}
exports.default = new KafkaClient();
