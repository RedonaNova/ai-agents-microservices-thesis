import kafkaClient from './kafka-client';
import database from './database';
import advisorService from './advisor-service';
import logger from './logger';

/**
 * Portfolio Advisor Agent - Main Entry Point
 * 
 * Responsibilities:
 * 1. Listen to portfolio-events topic
 * 2. Fetch relevant market data from PostgreSQL
 * 3. Generate AI-powered advice using Gemini
 * 4. Send response back to user-responses topic
 */
class PortfolioAdvisorAgent {
  private isRunning: boolean = false;

  /**
   * Start the portfolio advisor agent
   */
  async start(): Promise<void> {
    try {
      logger.info('==========================================');
      logger.info('Starting Portfolio Advisor Agent');
      logger.info('==========================================');

      // Connect to PostgreSQL
      logger.info('Connecting to PostgreSQL...');
      await database.connect();

      // Connect to Kafka
      logger.info('Connecting to Kafka...');
      await kafkaClient.connect();

      // Subscribe to portfolio-events topic
      logger.info('Subscribing to portfolio-events topic...');
      await kafkaClient.subscribe();

      // Start consuming messages
      logger.info('Starting message consumption...');
      await kafkaClient.startConsuming(async (payload) => {
        await advisorService.processRequest(payload);
      });

      this.isRunning = true;

      logger.info('==========================================');
      logger.info('✅ Portfolio Advisor Agent is running!');
      logger.info('==========================================');
      logger.info('Listening for portfolio advice requests...');
      logger.info('');
      logger.info('Capabilities:');
      logger.info('  - Investment recommendations');
      logger.info('  - Portfolio analysis');
      logger.info('  - Stock suggestions');
      logger.info('  - Risk assessment');
      logger.info('  - Diversification advice');
      logger.info('');
      logger.info('Data Sources:');
      logger.info('  - MSE Trading History (52K+ records)');
      logger.info('  - MSE Companies (75+ stocks)');
      logger.info('  - Real-time market data');
      logger.info('  - Gemini 2.0 Flash AI');
      logger.info('');
      logger.info('Kafka Topics:');
      logger.info('  IN: portfolio-events (listening)');
      logger.info('  OUT: user-responses (sending)');
      logger.info('==========================================');

    } catch (error: any) {
      logger.error('Failed to start portfolio advisor agent', { 
        error: error.message,
        stack: error.stack 
      });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down portfolio advisor agent...');

    // Disconnect from Kafka and Database
    await Promise.all([
      kafkaClient.disconnect(),
      database.disconnect()
    ]);

    this.isRunning = false;
    logger.info('Portfolio advisor agent stopped');
    process.exit(0);
  }
}

// Create instance
const agent = new PortfolioAdvisorAgent();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await agent.shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await agent.shutdown();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the agent
agent.start().catch((error) => {
  logger.error('Failed to start portfolio advisor', { error: error.message });
  process.exit(1);
});

