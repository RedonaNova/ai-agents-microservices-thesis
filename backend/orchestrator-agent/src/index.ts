import kafkaClient from './kafka-client';
import requestProcessor from './request-processor';
import agentRouter from './agent-router';
import logger from './logger';

/**
 * Orchestrator Agent - Main Entry Point
 * 
 * Responsibilities:
 * 1. Listen to user-requests topic
 * 2. Classify user intent using Gemini
 * 3. Route to appropriate specialized agents
 * 4. Aggregate responses if needed
 * 5. Send response back to user
 */
class OrchestratorAgent {
  private isRunning: boolean = false;
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Start the orchestrator agent
   */
  async start(): Promise<void> {
    try {
      logger.info('==========================================');
      logger.info('Starting Orchestrator Agent');
      logger.info('==========================================');

      // Connect to Kafka
      logger.info('Connecting to Kafka...');
      await kafkaClient.connect();

      // Subscribe to user-requests topic
      logger.info('Subscribing to user-requests topic...');
      await kafkaClient.subscribe();

      // Display agent registry
      const activeAgents = agentRouter.getActiveAgents();
      logger.info('Agent Registry', {
        totalAgents: activeAgents.length,
        agents: activeAgents.map(a => ({
          name: a.name,
          topic: a.topic,
          capabilities: a.capabilities
        }))
      });

      // Start consuming messages
      logger.info('Starting message consumption...');
      await kafkaClient.startConsuming(async (payload) => {
        await requestProcessor.processUserRequest(payload);
      });

      // Start cleanup interval for stale requests
      this.cleanupInterval = setInterval(() => {
        requestProcessor.cleanupStaleRequests(30000); // 30 second timeout
      }, 10000); // Check every 10 seconds

      this.isRunning = true;

      logger.info('==========================================');
      logger.info('✅ Orchestrator Agent is running!');
      logger.info('==========================================');
      logger.info('Listening for user requests...');
      logger.info('');
      logger.info('Available Intents:');
      logger.info('  - portfolio_advice: Investment recommendations');
      logger.info('  - market_analysis: Market trends and sector analysis');
      logger.info('  - news_query: Latest news and sentiment');
      logger.info('  - historical_analysis: Historical data and technical indicators');
      logger.info('  - risk_assessment: Risk metrics and portfolio risk');
      logger.info('  - general_query: General stock market questions');
      logger.info('');
      logger.info('Kafka Topics:');
      logger.info('  IN: user-requests (listening)');
      logger.info('  OUT: user-responses, portfolio-events, market-analysis-events, news-events, risk-assessment-events');
      logger.info('==========================================');

    } catch (error: any) {
      logger.error('Failed to start orchestrator agent', { 
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

    logger.info('Shutting down orchestrator agent...');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect from Kafka
    await kafkaClient.disconnect();

    this.isRunning = false;
    logger.info('Orchestrator agent stopped');
    process.exit(0);
  }
}

// Create instance
const orchestrator = new OrchestratorAgent();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await orchestrator.shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await orchestrator.shutdown();
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
orchestrator.start().catch((error) => {
  logger.error('Failed to start orchestrator', { error: error.message });
  process.exit(1);
});

