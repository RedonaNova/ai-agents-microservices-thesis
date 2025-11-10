"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const kafkajs_snappy_1 = __importDefault(require("kafkajs-snappy"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("./logger"));
// Register Snappy codec
kafkajs_1.CompressionCodecs[kafkajs_1.CompressionTypes.Snappy] = kafkajs_snappy_1.default;
class KafkaService {
    kafka;
    producer = null;
    consumers = new Map();
    responseHandlers = new Map();
    responseConsumerStarted = false;
    constructor() {
        this.kafka = new kafkajs_1.Kafka({
            clientId: config_1.config.kafkaClientId,
            brokers: [config_1.config.kafkaBroker],
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
    }
    async getProducer() {
        if (!this.producer) {
            this.producer = this.kafka.producer();
            await this.producer.connect();
            logger_1.default.info('Kafka producer connected');
        }
        return this.producer;
    }
    async sendEvent(topic, key, value) {
        try {
            const producer = await this.getProducer();
            await producer.send({
                topic,
                messages: [{
                        key,
                        value: JSON.stringify(value)
                    }]
            });
            logger_1.default.info(`Event sent to ${topic}`, { key });
        }
        catch (error) {
            logger_1.default.error('Failed to send Kafka event', { topic, error });
            throw error;
        }
    }
    async createConsumer(groupId, topics) {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topics, fromBeginning: false });
        this.consumers.set(groupId, consumer);
        logger_1.default.info(`Kafka consumer created for ${groupId}`, { topics });
        return consumer;
    }
    async consumeMessages(groupId, topics, handler) {
        const consumer = await this.createConsumer(groupId, topics);
        await consumer.run({
            eachMessage: async (payload) => {
                try {
                    await handler(payload);
                }
                catch (error) {
                    logger_1.default.error('Error processing Kafka message', { error, topic: payload.topic });
                }
            }
        });
    }
    /**
     * Subscribe to a specific response by requestId
     */
    subscribeToResponse(requestId, handler) {
        this.responseHandlers.set(requestId, handler);
        // Start response consumer if not already started
        if (!this.responseConsumerStarted) {
            this.startResponseConsumer();
        }
    }
    /**
     * Start consuming responses from rag-responses topic
     */
    async startResponseConsumer() {
        if (this.responseConsumerStarted)
            return;
        this.responseConsumerStarted = true;
        try {
            const consumer = await this.createConsumer('api-gateway-rag-responses', ['rag-responses']);
            await consumer.run({
                eachMessage: async ({ message }) => {
                    try {
                        if (!message.value)
                            return;
                        const response = JSON.parse(message.value.toString());
                        const requestId = response.requestId;
                        if (requestId && this.responseHandlers.has(requestId)) {
                            const handler = this.responseHandlers.get(requestId);
                            if (handler) {
                                handler(response);
                                this.responseHandlers.delete(requestId); // Clean up after handling
                            }
                        }
                    }
                    catch (error) {
                        logger_1.default.error('Error processing RAG response', { error });
                    }
                }
            });
            logger_1.default.info('RAG response consumer started');
        }
        catch (error) {
            logger_1.default.error('Failed to start RAG response consumer', { error });
            this.responseConsumerStarted = false;
        }
    }
    async disconnect() {
        if (this.producer) {
            await this.producer.disconnect();
            logger_1.default.info('Kafka producer disconnected');
        }
        for (const [groupId, consumer] of this.consumers) {
            await consumer.disconnect();
            logger_1.default.info(`Kafka consumer ${groupId} disconnected`);
        }
    }
    getKafkaInstance() {
        return this.kafka;
    }
    getConsumer(groupId) {
        if (!this.consumers.has(groupId)) {
            const consumer = this.kafka.consumer({ groupId });
            this.consumers.set(groupId, consumer);
        }
        return this.consumers.get(groupId);
    }
}
exports.default = new KafkaService();
//# sourceMappingURL=kafka.js.map