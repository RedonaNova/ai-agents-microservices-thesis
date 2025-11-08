import { EachMessagePayload } from 'kafkajs';
import geminiClient from './gemini-client';
import agentRouter from './agent-router';
import kafkaClient from './kafka-client';
import logger from './logger';
import { 
  UserRequest, 
  AgentRequest, 
  UserResponse, 
  AgentIntent 
} from './types';

/**
 * Request Processor - Main orchestration logic
 */
class RequestProcessor {
  private pendingRequests: Map<string, {
    startTime: number;
    request: UserRequest;
    expectedResponses: number;
    receivedResponses: any[];
  }> = new Map();

  /**
   * Process incoming user request message
   */
  async processUserRequest(payload: EachMessagePayload): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Parse message
      const messageValue = payload.message.value?.toString();
      if (!messageValue) {
        logger.warn('Empty message received');
        return;
      }

      const userRequest: UserRequest = JSON.parse(messageValue);
      logger.info('Processing user request', {
        requestId: userRequest.requestId,
        userId: userRequest.userId,
        message: userRequest.message.substring(0, 100)
      });

      // Step 1: Classify intent using Gemini
      const classification = await geminiClient.classifyIntent(
        userRequest.message,
        userRequest.context
      );

      logger.info('Intent classified', {
        requestId: userRequest.requestId,
        intent: classification.intent,
        confidence: classification.confidence
      });

      // Step 2: Route to appropriate agent
      const intent = this.mapToAgentIntent(classification.intent);
      const routing = agentRouter.route(intent, classification.confidence);

      // Step 3: Prepare agent request
      const agentRequest: AgentRequest = {
        requestId: userRequest.requestId,
        userId: userRequest.userId,
        intent,
        originalMessage: userRequest.message,
        parameters: {
          ...classification.entities,
          confidence: classification.confidence,
          reasoning: classification.reasoning
        },
        context: userRequest.context || {},
        timestamp: new Date().toISOString(),
        sourceAgent: 'orchestrator'
      };

      // Step 4: Track request if aggregation is needed
      if (routing.requiresAggregation) {
        this.pendingRequests.set(userRequest.requestId, {
          startTime,
          request: userRequest,
          expectedResponses: 1 + (routing.subAgents?.length || 0),
          receivedResponses: []
        });
      }

      // Step 5: Send to target agent(s)
      await kafkaClient.sendToAgent(routing.targetTopic, agentRequest);

      // Send to sub-agents if needed
      if (routing.subAgents && routing.subAgents.length > 0) {
        for (const subAgent of routing.subAgents) {
          const subAgentInfo = agentRouter.getAgent(subAgent);
          if (subAgentInfo) {
            await kafkaClient.sendToAgent(subAgentInfo.topic, agentRequest);
          }
        }
      }

      // If no aggregation needed, send immediate acknowledgment
      if (!routing.requiresAggregation) {
        const response: UserResponse = {
          requestId: userRequest.requestId,
          userId: userRequest.userId,
          success: true,
          message: `Your request has been routed to ${routing.targetAgent}. Processing...`,
          sources: [routing.targetAgent],
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

        await kafkaClient.sendUserResponse(response);
      }

      logger.info('Request processed successfully', {
        requestId: userRequest.requestId,
        targetAgent: routing.targetAgent,
        processingTime: Date.now() - startTime
      });

    } catch (error: any) {
      logger.error('Error processing user request', { 
        error: error.message,
        stack: error.stack 
      });

      // Send error response
      try {
        const messageValue = payload.message.value?.toString();
        if (messageValue) {
          const userRequest: UserRequest = JSON.parse(messageValue);
          
          const errorResponse: UserResponse = {
            requestId: userRequest.requestId,
            userId: userRequest.userId,
            success: false,
            message: 'Failed to process your request. Please try again.',
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };

          await kafkaClient.sendUserResponse(errorResponse);
        }
      } catch (sendError: any) {
        logger.error('Failed to send error response', { error: sendError.message });
      }
    }
  }

  /**
   * Map string intent to enum
   */
  private mapToAgentIntent(intentString: string): AgentIntent {
    const intentMap: Record<string, AgentIntent> = {
      'portfolio_advice': AgentIntent.PORTFOLIO_ADVICE,
      'market_analysis': AgentIntent.MARKET_ANALYSIS,
      'news_query': AgentIntent.NEWS_QUERY,
      'historical_analysis': AgentIntent.HISTORICAL_ANALYSIS,
      'risk_assessment': AgentIntent.RISK_ASSESSMENT,
      'general_query': AgentIntent.GENERAL_QUERY
    };

    return intentMap[intentString] || AgentIntent.UNKNOWN;
  }

  /**
   * Process agent response (for aggregation scenarios)
   */
  async processAgentResponse(agentResponse: any): Promise<void> {
    const requestId = agentResponse.requestId;
    const pending = this.pendingRequests.get(requestId);

    if (!pending) {
      // Not waiting for this response (already sent or not tracking)
      return;
    }

    pending.receivedResponses.push(agentResponse);

    // Check if all responses received
    if (pending.receivedResponses.length >= pending.expectedResponses) {
      // Aggregate responses and send to user
      const aggregatedResponse = this.aggregateResponses(pending);
      await kafkaClient.sendUserResponse(aggregatedResponse);

      // Clean up
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Aggregate multiple agent responses
   */
  private aggregateResponses(pending: {
    startTime: number;
    request: UserRequest;
    expectedResponses: number;
    receivedResponses: any[];
  }): UserResponse {
    const { startTime, request, receivedResponses } = pending;

    // Combine all agent responses
    const combinedData = receivedResponses.reduce((acc, response) => {
      return { ...acc, [response.agentName]: response.data };
    }, {});

    const sources = receivedResponses.map(r => r.agentName);
    const allSuccessful = receivedResponses.every(r => r.success);

    return {
      requestId: request.requestId,
      userId: request.userId,
      success: allSuccessful,
      message: allSuccessful 
        ? 'Your request has been processed by multiple agents.'
        : 'Some agents encountered errors while processing your request.',
      data: combinedData,
      sources,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up stale pending requests (timeout)
   */
  cleanupStaleRequests(timeoutMs: number = 30000): void {
    const now = Date.now();
    
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      if (now - pending.startTime > timeoutMs) {
        logger.warn('Request timed out', { 
          requestId,
          expectedResponses: pending.expectedResponses,
          receivedResponses: pending.receivedResponses.length
        });

        // Send partial response
        const partialResponse = this.aggregateResponses(pending);
        kafkaClient.sendUserResponse({
          ...partialResponse,
          message: 'Request partially completed (timeout)'
        });

        this.pendingRequests.delete(requestId);
      }
    }
  }
}

// Export singleton instance
export default new RequestProcessor();

