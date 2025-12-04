import kafkaClient from './kafka-client';
import intentClassifier from './intent-classifier';
import complexityDetector from './complexity-detector';
import logger from './logger';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// PostgreSQL connection for fetching user profiles
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'thesis_user',
  password: process.env.DB_PASSWORD || 'thesis_pass',
  database: process.env.DB_NAME || 'thesis_db',
  max: 5,
});

/**
 * Orchestrator Agent - Main Entry Point
 * 
 * New Architecture Responsibilities:
 * 1. Listen to user.requests topic
 * 2. Classify user intent using Gemini
 * 3. Detect complexity (simple vs. multi-agent)
 * 4. Route simple queries to agent.tasks
 * 5. Route complex queries to planning.tasks (for Flink Planner)
 * 6. Query knowledge.queries for RAG context when needed
 * 7. Send monitoring.events
 */
class OrchestratorAgent {
  private isRunning: boolean = false;
  private requestsProcessed: number = 0;
  private startTime: number = Date.now();

  /**
   * Start the orchestrator agent
   */
  async start(): Promise<void> {
    try {
      logger.info('==========================================');
      logger.info('🚀 Starting Orchestrator Agent (v2.0)');
      logger.info('==========================================');

      // Connect to Kafka
      logger.info('Connecting to Kafka...');
      await kafkaClient.connect();

      // Subscribe to topics
      logger.info('Subscribing to topics...');
      await kafkaClient.subscribe(['user.requests', 'knowledge.results']);

      // Display configuration
      logger.info('📋 Configuration:');
      logger.info('  - Input Topic: user.requests');
      logger.info('  - Output Topics: agent.tasks, planning.tasks, knowledge.queries');
      logger.info('  - Monitoring: monitoring.events');
      logger.info('');

      // Start consuming messages
      logger.info('Starting message consumption...');
      await kafkaClient.startConsuming(async (topic, message) => {
        const startTime = Date.now();
        
        try {
          if (topic === 'user.requests') {
            await this.processUserRequest(message);
          } else if (topic === 'knowledge.results') {
            await this.handleKnowledgeResult(message);
          }
          
          const duration = Date.now() - startTime;
          this.requestsProcessed++;
          
          // Log metrics
          if (this.requestsProcessed % 10 === 0) {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            logger.info(`📊 Metrics: ${this.requestsProcessed} requests processed, uptime: ${uptime}s`);
          }
        } catch (error: any) {
          logger.error('Error processing message', { error: error.message, topic });
          
          // Send error event
          await kafkaClient.sendEvent('monitoring.events', 'orchestrator', {
            eventId: `mon_${Date.now()}`,
            service: 'orchestrator-agent',
            eventType: 'error',
            message: `Failed to process ${topic} message`,
            metadata: { error: error.message },
            timestamp: new Date().toISOString(),
          });
        }
      });

      this.isRunning = true;

      logger.info('==========================================');
      logger.info('✅ Orchestrator Agent is running!');
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
   * Process user request from user.requests topic
   */
  private async processUserRequest(payload: any): Promise<void> {
    const { requestId, userId, query, type, context } = payload;
    
    logger.info('📥 New user request', { requestId, userId, type: type || 'auto-detect' });

    try {
      // Step 1: Classify intent (if not provided)
      const intent = type || await intentClassifier.classify(query);
      logger.info(`🧠 Intent classified: ${intent}`, { requestId });

      // Step 2: Check if RAG context is needed
      const needsRAG = this.shouldUseRAG(intent, query);
      let ragCorrelationId: string | null = null;

      if (needsRAG) {
        ragCorrelationId = uuidv4();
        logger.info('📚 Requesting RAG context', { requestId, ragCorrelationId });
        
        await kafkaClient.sendEvent('knowledge.queries', ragCorrelationId, {
          queryId: ragCorrelationId,
          correlationId: requestId,
          query,
          context: intent,
          topK: 5,
          filters: this.buildRAGFilters(intent, context),
          timestamp: new Date().toISOString(),
        });

        // Store request for later (when RAG results come back)
        // In production, use Redis or similar
        // For now, we'll continue without waiting
      }

      // Step 3: Detect complexity
      const complexity = await complexityDetector.detect(query, intent, context);
      logger.info(`⚡ Complexity: ${complexity.level}`, { requestId });

      // Step 4: Route based on complexity
      if (complexity.level === 'simple') {
        // Route directly to agent.tasks
        await this.routeToAgent(requestId, userId, intent, query, context);
      } else {
        // Route to planning.tasks for Flink
        await this.routeToPlanner(requestId, userId, intent, query, context, complexity);
      }

      // Send monitoring event
      await kafkaClient.sendEvent('monitoring.events', 'orchestrator', {
        eventId: `mon_${Date.now()}`,
        service: 'orchestrator-agent',
        eventType: 'metric',
        message: 'Request routed successfully',
        metadata: {
          requestId,
          intent,
          complexity: complexity.level,
          needsRAG,
          processingTimeMs: Date.now() - payload.timestamp,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Error processing user request', { requestId, error: error.message });
      
      // Send error response
      await kafkaClient.sendEvent('agent.responses', requestId, {
        responseId: uuidv4(),
        requestId,
        correlationId: requestId,
        agentType: 'orchestrator',
        status: 'error',
        result: {
          error: 'Failed to process request',
          message: error.message,
        },
        metadata: {
          processingTimeMs: Date.now() - payload.timestamp,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle RAG results from knowledge.results topic
   */
  private async handleKnowledgeResult(payload: any): Promise<void> {
    const { queryId, correlationId, results } = payload;
    logger.info('📚 Received RAG results', { queryId, correlationId, resultCount: results.length });
    
    // In a complete implementation, this would:
    // 1. Retrieve the original request from cache/Redis
    // 2. Augment the request with RAG context
    // 3. Continue routing with enriched context
    
    // For thesis demo, we'll log and continue
  }

  /**
   * Fetch user profile from PostgreSQL for personalized AI responses
   */
  private async getUserProfile(userId: string): Promise<any | null> {
    try {
      const result = await db.query(
        `SELECT id, email, name, investment_goal, risk_tolerance, preferred_industries 
         FROM users WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        return {
          id: user.id,
          name: user.name,
          investmentGoal: user.investment_goal,
          riskTolerance: user.risk_tolerance,
          preferredIndustries: user.preferred_industries || [],
        };
      }
      return null;
    } catch (error: any) {
      logger.error('Failed to fetch user profile', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Route simple request to agent.tasks
   */
  private async routeToAgent(
    requestId: string,
    userId: string,
    intent: string,
    query: string,
    context: any
  ): Promise<void> {
    const agentType = this.getAgentType(intent);
    const taskId = uuidv4();

    logger.info(`➡️  Routing to ${agentType} agent`, { requestId, taskId });

    // Fetch user profile for personalized AI responses (ReAct pattern)
    let userProfile = null;
    if (userId && agentType === 'investment') {
      userProfile = await this.getUserProfile(userId);
      if (userProfile) {
        logger.info(`👤 User profile fetched for personalization`, { 
          userId, 
          investmentGoal: userProfile.investmentGoal,
          riskTolerance: userProfile.riskTolerance 
        });
      }
    }

    await kafkaClient.sendEvent('agent.tasks', taskId, {
      taskId,
      correlationId: requestId,
      requestId,
      agentType,
      action: this.getAgentAction(intent),
      payload: {
        userId,
        query,
        context,
        userProfile, // Include user profile for personalized responses
      },
      priority: 'normal',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Route complex request to planning.tasks for Flink
   */
  private async routeToPlanner(
    requestId: string,
    userId: string,
    intent: string,
    query: string,
    context: any,
    complexity: any
  ): Promise<void> {
    const taskId = uuidv4();
    const correlationId = uuidv4();

    logger.info(`🔀 Routing to Flink Planner (complex workflow)`, { requestId, taskId });

    await kafkaClient.sendEvent('planning.tasks', taskId, {
      taskId,
      correlationId,
      requestId,
      userId,
      complexity: complexity.level,
      query,
      requiredAgents: complexity.requiredAgents || ['investment'],
      constraints: {
        maxLatency: 10000,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Determine if query needs RAG context
   */
  private shouldUseRAG(intent: string, query: string): boolean {
    // Use RAG for questions about specific companies or market knowledge
    const ragIntents = ['portfolio', 'market', 'company_info'];
    const ragKeywords = ['компани', 'APU', 'TDB', 'банк', "Khan", 'уул уурхай'];
    
    return ragIntents.includes(intent) || 
           ragKeywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * Build RAG filters based on intent and context
   */
  private buildRAGFilters(intent: string, context: any): any {
    const filters: any = {};
    
    if (intent === 'portfolio' || intent === 'market') {
      filters.content_type = 'company_profile';
    }
    
    if (context?.symbols && context.symbols.length > 0) {
      filters.symbol = context.symbols[0];
    }
    
    return filters;
  }

  /**
   * Map intent to agent type
   */
  private getAgentType(intent: string): string {
    const mapping: Record<string, string> = {
      'portfolio': 'investment',
      'portfolio_advice': 'investment',
      'market_analysis': 'investment',
      'risk_assessment': 'investment',
      'historical_analysis': 'investment',
      'news': 'news',
      'news_query': 'news',
      'sentiment': 'news',
    };
    
    return mapping[intent] || 'investment';
  }

  /**
   * Map intent to agent action
   */
  private getAgentAction(intent: string): string {
    const mapping: Record<string, string> = {
      'portfolio': 'analyze_portfolio',
      'portfolio_advice': 'provide_advice',
      'market_analysis': 'analyze_market',
      'news': 'get_news',
      'news_query': 'get_news',
    };
    
    return mapping[intent] || 'process_query';
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down orchestrator agent...');
    logger.info(`Total requests processed: ${this.requestsProcessed}`);

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
