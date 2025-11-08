import { EachMessagePayload } from 'kafkajs';
import geminiClient from './gemini-client';
import database from './database';
import kafkaClient from './kafka-client';
import logger from './logger';
import { 
  AgentRequest, 
  AgentResponse, 
  UserResponse,
  PortfolioAdvice 
} from './types';

/**
 * Portfolio Advisor Service - Main business logic
 */
class AdvisorService {
  /**
   * Process incoming portfolio advice request
   */
  async processRequest(payload: EachMessagePayload): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Parse message
      const messageValue = payload.message.value?.toString();
      if (!messageValue) {
        logger.warn('Empty message received');
        return;
      }

      const request: AgentRequest = JSON.parse(messageValue);
      
      logger.info('Processing portfolio advice request', {
        requestId: request.requestId,
        userId: request.userId,
        message: request.originalMessage.substring(0, 100)
      });

      // Step 1: Extract stock symbols from request
      const symbols = this.extractSymbols(request);
      
      // Step 2: Fetch relevant market data
      let marketData = [];
      if (symbols.length > 0) {
        marketData = await database.getMultipleStocks(symbols);
        logger.info('Fetched market data', { symbols, count: marketData.length });
      }

      // Step 3: Get top performers for context
      const topPerformers = await database.getTopPerformers(5);
      logger.info('Fetched top performers', { count: topPerformers.length });

      // Step 4: Generate AI-powered advice using Gemini
      const advice: PortfolioAdvice = await geminiClient.generateAdvice({
        userMessage: request.originalMessage,
        portfolio: request.context.portfolio,
        watchlist: request.context.watchlist || [],
        preferences: request.context.preferences,
        marketData,
        topPerformers
      });

      logger.info('Generated portfolio advice', {
        requestId: request.requestId,
        recommendation: advice.recommendation,
        confidence: advice.confidence,
        suggestedStocksCount: advice.suggestedStocks?.length || 0
      });

      // Step 5: Build response message
      const responseMessage = this.buildResponseMessage(advice, request.originalMessage);

      // Step 6: Send response back to user
      const userResponse: UserResponse = {
        requestId: request.requestId,
        userId: request.userId,
        success: true,
        message: responseMessage,
        data: {
          advice,
          marketData,
          topPerformers: topPerformers.slice(0, 3)
        },
        sources: ['portfolio-advisor'],
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(userResponse);

      logger.info('Portfolio advice request completed', {
        requestId: request.requestId,
        processingTime: userResponse.processingTime
      });

    } catch (error: any) {
      logger.error('Error processing portfolio advice request', { 
        error: error.message,
        stack: error.stack 
      });

      // Send error response
      try {
        const messageValue = payload.message.value?.toString();
        if (messageValue) {
          const request: AgentRequest = JSON.parse(messageValue);
          
          const errorResponse: UserResponse = {
            requestId: request.requestId,
            userId: request.userId,
            success: false,
            message: 'Sorry, I encountered an error while generating portfolio advice. Please try again.',
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };

          await kafkaClient.sendResponse(errorResponse);
        }
      } catch (sendError: any) {
        logger.error('Failed to send error response', { error: sendError.message });
      }
    }
  }

  /**
   * Extract stock symbols from the request
   */
  private extractSymbols(request: AgentRequest): string[] {
    const symbols: Set<string> = new Set();

    // From watchlist
    if (request.context.watchlist) {
      request.context.watchlist.forEach(s => symbols.add(s.toUpperCase()));
    }

    // From portfolio
    if (request.context.portfolio) {
      request.context.portfolio.holdings.forEach(h => symbols.add(h.symbol.toUpperCase()));
    }

    // From parameters
    if (request.parameters.stocks) {
      if (Array.isArray(request.parameters.stocks)) {
        request.parameters.stocks.forEach((s: string) => symbols.add(s.toUpperCase()));
      }
    }

    // Try to extract from message using regex
    const message = request.originalMessage.toUpperCase();
    const msePattern = /\b([A-Z]{3,5})-O-\d{4}\b/g;
    const matches = message.match(msePattern);
    if (matches) {
      matches.forEach(m => symbols.add(m));
    }

    // Also try simple 3-5 letter uppercase words (potential symbols)
    const simplePattern = /\b([A-Z]{3,5})\b/g;
    const simpleMatches = message.match(simplePattern);
    if (simpleMatches) {
      simpleMatches.slice(0, 5).forEach(m => symbols.add(m)); // Limit to 5
    }

    return Array.from(symbols);
  }

  /**
   * Build human-readable response message
   */
  private buildResponseMessage(advice: PortfolioAdvice, originalMessage: string): string {
    let message = `## Portfolio Advice\n\n`;

    message += `**Recommendation:** ${advice.recommendation.toUpperCase()}\n`;
    message += `**Confidence:** ${(advice.confidence * 100).toFixed(0)}%\n\n`;

    message += `### Analysis\n${advice.reasoning}\n\n`;

    if (advice.suggestedStocks && advice.suggestedStocks.length > 0) {
      message += `### Suggested Stocks\n`;
      advice.suggestedStocks.forEach(stock => {
        message += `\n**${stock.symbol}** (${stock.name})\n`;
        message += `- Action: ${stock.action.toUpperCase()}\n`;
        message += `- Current Price: ₮${stock.currentPrice.toFixed(2)}\n`;
        if (stock.targetPrice) {
          message += `- Target Price: ₮${stock.targetPrice.toFixed(2)}\n`;
        }
        message += `- Reasoning: ${stock.reasoning}\n`;
        message += `- Confidence: ${(stock.confidence * 100).toFixed(0)}%\n`;
      });
      message += `\n`;
    }

    if (advice.riskAnalysis) {
      message += `### Risk Analysis\n${advice.riskAnalysis}\n\n`;
    }

    if (advice.diversificationAdvice) {
      message += `### Diversification\n${advice.diversificationAdvice}\n\n`;
    }

    if (advice.actionItems && advice.actionItems.length > 0) {
      message += `### Action Items\n`;
      advice.actionItems.forEach((item, i) => {
        message += `${i + 1}. ${item}\n`;
      });
      message += `\n`;
    }

    message += `\n*Disclaimer: This is AI-generated advice for informational purposes only. Please consult a certified financial advisor before making investment decisions.*`;

    return message;
  }
}

// Export singleton instance
export default new AdvisorService();

