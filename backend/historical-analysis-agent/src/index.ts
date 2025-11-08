import kafkaClient from './kafka-client';
import historicalService from './historical-service';
import logger from './logger';
import { UserRequest } from './types';

async function main() {
  try {
    logger.info('Starting Historical Analysis Agent...');
    
    // Connect to Kafka
    await kafkaClient.connect();
    await kafkaClient.subscribe();
    
    // Start consuming messages
    await kafkaClient.startConsuming(async ({ message }) => {
      try {
        const request: UserRequest = JSON.parse(message.value!.toString());
        
        // Only process historical analysis requests
        if (request.intent === 'historical_analysis') {
          logger.info(`Received request: ${request.requestId} for user: ${request.userId}`);
          await historicalService.processRequest(request);
        }
      } catch (error: any) {
        logger.error(`Failed to process message: ${error.message}`);
      }
    });
    
    logger.info('Historical Analysis Agent is running and ready to process requests');
  } catch (error: any) {
    logger.error(`Failed to start Historical Analysis Agent: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await kafkaClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await kafkaClient.disconnect();
  process.exit(0);
});

main();

