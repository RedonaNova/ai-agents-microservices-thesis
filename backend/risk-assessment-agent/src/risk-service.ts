import db from './database';
import geminiClient from './gemini-client';
import riskCalculator from './risk-calculator';
import kafkaClient from './kafka-client';
import logger from './logger';
import { UserRequest, AgentResponse, RiskAssessmentReport, PortfolioHolding, StockVolatility } from './types';

class RiskService {
  async processRequest(request: UserRequest): Promise<void> {
    const startTime = Date.now();
    logger.info(`Processing risk assessment request: ${request.requestId}`);

    try {
      // Get portfolio from metadata or use default
      const portfolio = request.metadata?.portfolio || await this.getDefaultPortfolio();
      const confidenceLevel = request.metadata?.confidenceLevel || 0.95;
      const timeHorizon = request.metadata?.timeHorizon || 252; // 1 year

      // Fetch current prices and calculate volatilities
      const symbols = portfolio.map(h => h.symbol);
      const currentPrices = await this.fetchCurrentPrices(symbols);
      const volatilities = await this.calculateVolatilities(symbols);

      // Calculate portfolio value and weights
      const totalValue = portfolio.reduce((sum, h) => {
        const price = currentPrices.get(h.symbol) || h.avgPrice;
        return sum + (h.shares * price);
      }, 0);

      const weights = portfolio.map(h => {
        const price = currentPrices.get(h.symbol) || h.avgPrice;
        return (h.shares * price) / totalValue;
      });

      // Calculate VaR
      const varAnalysis = riskCalculator.calculateVaR(totalValue, volatilities, weights, confidenceLevel);

      // Run Monte Carlo simulation
      const portfolioVolatility = this.calculatePortfolioVolatility(volatilities, weights);
      const expectedReturn = 0.10; // Assume 10% annual return (can be refined)
      const monteCarloResults = riskCalculator.runMonteCarloSimulation(
        totalValue,
        expectedReturn,
        portfolioVolatility,
        timeHorizon,
        1000
      );

      // Calculate portfolio metrics
      const portfolioMetrics = riskCalculator.calculatePortfolioMetrics(portfolio, currentPrices, volatilities);

      // Generate AI insights
      const analysis = await geminiClient.generateRiskInsights(varAnalysis, monteCarloResults, portfolioMetrics);

      // Build report
      const report: RiskAssessmentReport = {
        summary: analysis.summary,
        valueAtRisk: varAnalysis,
        monteCarloSimulation: monteCarloResults,
        portfolioMetrics,
        riskLevel: analysis.riskLevel,
        recommendations: analysis.recommendations,
        insights: analysis.insights
      };

      // Send response
      const response: AgentResponse = {
        requestId: request.requestId,
        userId: request.userId,
        agent: 'risk-assessment',
        status: 'success',
        data: report,
        message: 'Risk assessment completed successfully',
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(response);
      const duration = Date.now() - startTime;
      logger.info(`Risk assessment completed in ${duration}ms`);
    } catch (error: any) {
      logger.error(`Failed to process risk assessment: ${error.message}`);
      await this.sendErrorResponse(request, error.message);
    }
  }

  private async getDefaultPortfolio(): Promise<PortfolioHolding[]> {
    // Return a sample portfolio with top MSE stocks
    const query = `
      SELECT DISTINCT symbol
      FROM mse_companies
      ORDER BY symbol
      LIMIT 5
    `;
    
    const result = await db.query(query);
    return result.rows.map(r => ({
      symbol: r.symbol,
      shares: 100,
      avgPrice: 1000
    }));
  }

  private async fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
    const query = `
      SELECT DISTINCT ON (symbol) 
        symbol,
        closing_price
      FROM mse_trading_history
      WHERE UPPER(symbol) = ANY($1::text[])
      ORDER BY symbol, trade_date DESC
    `;

    const upperSymbols = symbols.map(s => s.toUpperCase());
    const result = await db.query(query, [upperSymbols]);
    
    const priceMap = new Map<string, number>();
    result.rows.forEach(row => {
      priceMap.set(row.symbol, Number(row.closing_price));
    });
    
    return priceMap;
  }

  private async calculateVolatilities(symbols: string[]): Promise<StockVolatility[]> {
    const volatilities: StockVolatility[] = [];

    for (const symbol of symbols) {
      const query = `
        SELECT closing_price
        FROM mse_trading_history
        WHERE UPPER(symbol) = UPPER($1)
        ORDER BY trade_date DESC
        LIMIT 30
      `;

      const result = await db.query(query, [symbol]);
      const prices = result.rows.map(r => Number(r.closing_price));

      if (prices.length > 1) {
        const returns = riskCalculator.calculateReturns(prices);
        const dailyVolatility = riskCalculator.calculateVolatility(returns);

        volatilities.push({
          symbol,
          dailyVolatility,
          returns
        });
      } else {
        // Default volatility if insufficient data
        volatilities.push({
          symbol,
          dailyVolatility: 0.02, // 2% daily volatility
          returns: []
        });
      }
    }

    return volatilities;
  }

  private calculatePortfolioVolatility(volatilities: StockVolatility[], weights: number[]): number {
    // Simplified: assume independent assets
    return Math.sqrt(
      weights.reduce((sum, w, i) => sum + Math.pow(w * (volatilities[i]?.dailyVolatility || 0.02), 2), 0)
    );
  }

  private async sendErrorResponse(request: UserRequest, errorMessage: string): Promise<void> {
    const response: AgentResponse = {
      requestId: request.requestId,
      userId: request.userId,
      agent: 'risk-assessment',
      status: 'error',
      message: `Risk assessment failed: ${errorMessage}`,
      timestamp: new Date().toISOString()
    };

    await kafkaClient.sendResponse(response);
  }
}

export default new RiskService();

