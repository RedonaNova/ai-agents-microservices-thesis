import db from './database';
import geminiClient from './gemini-client';
import kafkaClient from './kafka-client';
import logger from './logger';
import { UserRequest, AgentResponse, NewsIntelligenceReport, NewsArticle } from './types';

class NewsService {
  async processRequest(request: UserRequest): Promise<void> {
    const startTime = Date.now();
    logger.info(`Processing news intelligence request: ${request.requestId}`);

    try {
      // Get relevant symbols
      const symbols = request.metadata?.symbols || await this.getTopSymbols();
      
      // Fetch news and sentiment analysis
      const { articles, marketImpact, keyTopics } = await geminiClient.analyzeNews(symbols);
      
      // Calculate sentiment overview
      const sentimentOverview = this.calculateSentiment(articles);
      
      // Build report
      const report: NewsIntelligenceReport = {
        summary: `Analyzed ${articles.length} news articles for ${symbols.length} MSE companies. ${marketImpact}`,
        articles,
        sentimentOverview,
        keyTopics,
        marketImpact
      };

      // Send response
      const response: AgentResponse = {
        requestId: request.requestId,
        userId: request.userId,
        agent: 'news-intelligence',
        status: 'success',
        data: report,
        message: 'News intelligence analysis completed',
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(response);
      const duration = Date.now() - startTime;
      logger.info(`News analysis completed in ${duration}ms`);
    } catch (error: any) {
      logger.error(`Failed to process news request: ${error.message}`);
      await this.sendErrorResponse(request, error.message);
    }
  }

  private async getTopSymbols(): Promise<string[]> {
    const query = `
      SELECT DISTINCT symbol
      FROM mse_companies
      ORDER BY symbol
      LIMIT 10
    `;
    
    const result = await db.query(query);
    return result.rows.map(r => r.symbol);
  }

  private calculateSentiment(articles: NewsArticle[]) {
    const positive = articles.filter(a => a.sentiment === 'positive').length;
    const neutral = articles.filter(a => a.sentiment === 'neutral').length;
    const negative = articles.filter(a => a.sentiment === 'negative').length;
    
    return { positive, neutral, negative };
  }

  private async sendErrorResponse(request: UserRequest, errorMessage: string): Promise<void> {
    const response: AgentResponse = {
      requestId: request.requestId,
      userId: request.userId,
      agent: 'news-intelligence',
      status: 'error',
      message: `News analysis failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    };
    
    await kafkaClient.sendResponse(response);
  }
}

export default new NewsService();

