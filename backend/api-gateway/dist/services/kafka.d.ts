import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
declare class KafkaService {
    private kafka;
    private producer;
    private consumers;
    private responseHandlers;
    private responseConsumerStarted;
    constructor();
    getProducer(): Promise<Producer>;
    sendEvent(topic: string, key: string, value: any): Promise<void>;
    createConsumer(groupId: string, topics: string[]): Promise<Consumer>;
    consumeMessages(groupId: string, topics: string[], handler: (payload: EachMessagePayload) => Promise<void>): Promise<void>;
    /**
     * Subscribe to a specific response by requestId
     */
    subscribeToResponse(requestId: string, handler: (response: any) => void): void;
    /**
     * Start consuming responses from rag-responses topic
     */
    private startResponseConsumer;
    disconnect(): Promise<void>;
    getKafkaInstance(): Kafka;
    getConsumer(groupId: string): Consumer;
}
declare const _default: KafkaService;
export default _default;
//# sourceMappingURL=kafka.d.ts.map