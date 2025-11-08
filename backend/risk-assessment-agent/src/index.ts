import kafkaClient from './kafka-client';
import riskService from './risk-service';
import logger from './logger';
import { UserRequest } from './types';

async function main() {
  try {
    logger.info('Starting Risk Assessment Agent...');
    
    // Connect to Kafka
    await kafkaClient.connect();
    await kafkaClient.subscribe();
    
    // Start consuming messages
    await kafkaClient.startConsuming(async ({ message }) => {
      try {
        const request: UserRequest = JSON.parse(message.value!.toString());
        logger.info(`Received request: ${request.requestId} for user: ${request.userId}`);
        
        // Process the risk assessment request
        await riskService.processRequest(request);
      } catch (error: any) {
        logger.error(`Failed to process message: ${error.message}`);
      }
    });
    
    logger.info('Risk Assessment Agent is running and ready to process requests');
  } catch (error: any) {
    logger.error(`Failed to start Risk Assessment Agent: ${error.message}`);
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

