import db from './database';
import geminiClient from './gemini-client';
import technicalIndicators from './technical-indicators';
import kafkaClient from './kafka-client';
import logger from './logger';
import { UserRequest, AgentResponse, HistoricalAnalysisReport, HistoricalData, PricePoint } from './types';

class HistoricalService {
  async processRequest(request: UserRequest): Promise<void> {
    const startTime = Date.now();
    logger.info(`Processing historical analysis request: ${request.requestId}`);

    try {
      // Extract symbol from request
      const symbol = this.extractSymbol(request);
      const period = request.metadata?.period || 90; // Default 90 days

      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(symbol, period);
      
      if (historicalData.length === 0) {
        throw new Error(`No historical data found for ${symbol}`);
      }

      // Calculate technical indicators
      const indicators = technicalIndicators.calculateAllIndicators(historicalData);
      
      // Convert to price points
      const priceHistory: PricePoint[] = historicalData.map(d => ({
        date: d.trade_date.toISOString().split('T')[0],
        open: Number(d.opening_price),
        high: Number(d.high_price),
        low: Number(d.low_price),
        close: Number(d.closing_price),
        volume: Number(d.volume)
      }));

      // Generate AI analysis
      const analysis = await geminiClient.analyzeHistoricalData(symbol, indicators, priceHistory);

      // Build report
      const report: HistoricalAnalysisReport = {
        symbol,
        summary: analysis.summary,
        technicalIndicators: indicators,
        priceHistory: priceHistory.slice(-30), // Last 30 days for response size
        patterns: analysis.patterns,
        recommendation: analysis.recommendation,
        insights: analysis.insights
      };

      // Send response
      const response: AgentResponse = {
        requestId: request.requestId,
        userId: request.userId,
        agent: 'historical-analysis',
        status: 'success',
        data: report,
        message: `Historical analysis completed for ${symbol}`,
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(response);
      const duration = Date.now() - startTime;
      logger.info(`Historical analysis completed in ${duration}ms`);
    } catch (error: any) {
      logger.error(`Failed to process historical analysis: ${error.message}`);
      await this.sendErrorResponse(request, error.message);
    }
  }

  private extractSymbol(request: UserRequest): string {
    // Try metadata first
    if (request.metadata?.symbol) {
      return request.metadata.symbol.toUpperCase();
    }

    // Try to extract from message
    const symbolMatch = request.message.match(/\b([A-Z]{3,5})\b/);
    if (symbolMatch) {
      return symbolMatch[1];
    }

    // Default to a common MSE symbol
    return 'APU';
  }

  private async fetchHistoricalData(symbol: string, days: number): Promise<HistoricalData[]> {
    const query = `
      SELECT 
        symbol,
        trade_date,
        opening_price,
        closing_price,
        high_price,
        low_price,
        volume,
        previous_close
      FROM mse_trading_history
      WHERE UPPER(symbol) = UPPER($1)
      ORDER BY trade_date DESC
      LIMIT $2
    `;

    const result = await db.query(query, [symbol, days]);
    return result.rows.reverse(); // Oldest first for calculations
  }

  private async sendErrorResponse(request: UserRequest, errorMessage: string): Promise<void> {
    const response: AgentResponse = {
      requestId: request.requestId,
      userId: request.userId,
      agent: 'historical-analysis',
      status: 'error',
      message: `Historical analysis failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    };

    await kafkaClient.sendResponse(response);
  }
}

export default new HistoricalService();

