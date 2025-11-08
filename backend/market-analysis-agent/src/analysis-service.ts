import db from './database';
import geminiClient from './gemini-client';
import kafkaClient from './kafka-client';
import logger from './logger';
import { UserRequest, AgentResponse, MarketAnalysisReport, StockPerformance } from './types';

class AnalysisService {
  async processRequest(request: UserRequest): Promise<void> {
    const startTime = Date.now();
    logger.info(`Processing market analysis request: ${request.requestId}`);

    try {
      // Fetch market data
      const marketData = await this.fetchMarketData();
      
      // Calculate statistics
      const stats = this.calculateMarketStats(marketData);
      
      // Get top/bottom performers
      const topPerformers = marketData.slice(0, 5);
      const bottomPerformers = marketData.slice(-5).reverse();
      
      // Generate AI insights
      const insights = await geminiClient.generateMarketInsights(topPerformers, bottomPerformers, stats);
      
      // Build report
      const report: MarketAnalysisReport = {
        summary: insights,
        marketOverview: {
          totalCompanies: stats.total,
          gainers: stats.gainers,
          losers: stats.losers,
          averageChange: stats.avgChange
        },
        topPerformers,
        bottomPerformers,
        insights: this.extractInsights(insights)
      };

      // Send response
      const response: AgentResponse = {
        requestId: request.requestId,
        userId: request.userId,
        agent: 'market-analysis',
        status: 'success',
        data: report,
        message: 'Market analysis completed successfully',
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(response);
      const duration = Date.now() - startTime;
      logger.info(`Market analysis completed in ${duration}ms`);
    } catch (error: any) {
      logger.error(`Failed to process market analysis: ${error.message}`);
      await this.sendErrorResponse(request, error.message);
    }
  }

  private async fetchMarketData(): Promise<StockPerformance[]> {
    const query = `
      SELECT 
        c.symbol,
        c.name as "companyName",
        th.closing_price as "closingPrice",
        (th.closing_price - th.previous_close) as change,
        CASE 
          WHEN th.previous_close > 0 
          THEN ((th.closing_price - th.previous_close) / th.previous_close * 100)
          ELSE 0
        END as "changePercent",
        th.volume
      FROM mse_companies c
      LEFT JOIN LATERAL (
        SELECT * FROM mse_trading_history
        WHERE symbol = c.symbol
        ORDER BY trade_date DESC
        LIMIT 1
      ) th ON true
      WHERE th.closing_price IS NOT NULL
      ORDER BY "changePercent" DESC NULLS LAST
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  private calculateMarketStats(data: StockPerformance[]) {
    const total = data.length;
    const gainers = data.filter(s => s.changePercent > 0).length;
    const losers = data.filter(s => s.changePercent < 0).length;
    const avgChange = data.reduce((sum, s) => sum + Number(s.changePercent), 0) / total;
    
    return { total, gainers, losers, avgChange };
  }

  private extractInsights(aiResponse: string): string[] {
    // Extract key points from AI response
    const lines = aiResponse.split('\n').filter(l => l.trim());
    const insights = lines.filter(l => 
      l.includes('•') || 
      l.includes('-') || 
      l.match(/^\d+\./)
    ).slice(0, 5);
    
    return insights.length > 0 ? insights : [aiResponse.slice(0, 200)];
  }

  private async sendErrorResponse(request: UserRequest, errorMessage: string): Promise<void> {
    const response: AgentResponse = {
      requestId: request.requestId,
      userId: request.userId,
      agent: 'market-analysis',
      status: 'error',
      message: `Market analysis failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    };
    
    await kafkaClient.sendResponse(response);
  }
}

export default new AnalysisService();

