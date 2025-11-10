import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import logger from './logger';
import kafkaClient from './kafka-client';
import qdrantClient from './qdrant-client';
import ragService from './rag-service';
import { KafkaMessage, RAGQuery } from './types';

async function main() {
  try {
    logger.info('========================================');
    logger.info('Starting RAG Service');
    logger.info('========================================');

    // Initialize Qdrant
    logger.info('Initializing Qdrant...');
    await qdrantClient.initialize();

    // Connect to Kafka
    logger.info('Connecting to Kafka...');
    await kafkaClient.connect();

    // Start consuming messages
    logger.info('Starting message consumer...');
    await kafkaClient.startConsuming(async (message: KafkaMessage) => {
      try {
        // Build RAG query
        const ragQuery: RAGQuery = {
          requestId: message.requestId,
          userId: message.userId,
          query: message.query || message.message || '',
          language: 'mongolian', // Default to Mongolian
          topK: 5,
          metadata: message.metadata,
        };

        // Process query
        logger.info('Processing RAG query', {
          requestId: ragQuery.requestId,
          query: ragQuery.query,
        });

        const response = await ragService.query(ragQuery);

        // Send response
        await kafkaClient.sendResponse(message.requestId, {
          requestId: response.requestId,
          status: 'completed',
          data: {
            answer: response.answer,
            sources: response.sources,
            confidence: response.confidence,
            language: response.language,
          },
          message: response.answer,
          timestamp: new Date().toISOString(),
        });

        logger.info('RAG query completed', {
          requestId: response.requestId,
          sourceCount: response.sources.length,
          confidence: response.confidence.toFixed(2),
        });
      } catch (error) {
        logger.error('Failed to process RAG query', {
          error,
          requestId: message.requestId,
        });

        // Send error response
        await kafkaClient.sendResponse(message.requestId, {
          requestId: message.requestId,
          status: 'failed',
          error: 'Failed to process RAG query',
          timestamp: new Date().toISOString(),
        });
      }
    });

    logger.info('========================================');
    logger.info('✅ RAG Service is running!');
    logger.info('========================================');
    logger.info('Capabilities:');
    logger.info('  - Semantic search over MSE companies');
    logger.info('  - Mongolian language responses');
    logger.info('  - Real-time query processing');
    logger.info('  - Vector similarity search');
    logger.info(' ');
    logger.info('Listening on:');
    logger.info(`  - Input: rag-queries`);
    logger.info(`  - Output: rag-responses`);
    logger.info('========================================');
  } catch (error) {
    logger.error('Failed to start RAG service', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down RAG service...');
  await kafkaClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down RAG service...');
  await kafkaClient.disconnect();
  process.exit(0);
});

// Start service
main();

