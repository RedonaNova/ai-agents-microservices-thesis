import { VaRAnalysis, MonteCarloResults, PortfolioMetrics, StockVolatility, PortfolioHolding } from './types';

export class RiskCalculator {
  /**
   * Calculate Value at Risk (VaR) using historical simulation
   */
  calculateVaR(
    portfolioValue: number,
    volatilities: StockVolatility[],
    weights: number[],
    confidenceLevel: number = 0.95
  ): VaRAnalysis {
    // Calculate portfolio volatility (simplified - assuming independent assets)
    const portfolioVolatility = Math.sqrt(
      weights.reduce((sum, w, i) => sum + Math.pow(w * (volatilities[i]?.dailyVolatility || 0.02), 2), 0)
    );

    // Calculate VaR at different time horizons
    const zScore = this.getZScore(confidenceLevel);
    const oneDay = portfolioValue * portfolioVolatility * zScore;
    const oneWeek = oneDay * Math.sqrt(5); // Square root of time rule
    const oneMonth = oneDay * Math.sqrt(20);

    return {
      oneDay,
      oneWeek,
      oneMonth,
      confidenceLevel,
      interpretation: `With ${(confidenceLevel * 100).toFixed(0)}% confidence, maximum loss in one day is ${oneDay.toFixed(0)} MNT`
    };
  }

  /**
   * Run Monte Carlo simulation for portfolio
   */
  runMonteCarloSimulation(
    portfolioValue: number,
    expectedReturn: number,
    volatility: number,
    timeHorizon: number = 252, // 1 year trading days
    simulations: number = 1000
  ): MonteCarloResults {
    const results: number[] = [];

    for (let i = 0; i < simulations; i++) {
      let value = portfolioValue;
      
      // Simulate daily returns
      for (let day = 0; day < timeHorizon; day++) {
        const randomReturn = this.generateRandomReturn(expectedReturn / 252, volatility / Math.sqrt(252));
        value *= (1 + randomReturn);
      }
      
      results.push(value);
    }

    results.sort((a, b) => a - b);

    const finalReturns = results.map(v => (v - portfolioValue) / portfolioValue);
    const avgReturn = finalReturns.reduce((sum, r) => sum + r, 0) / simulations;
    const lossCount = finalReturns.filter(r => r < 0).length;

    return {
      simulations,
      expectedReturn: avgReturn * 100,
      worstCase: Math.min(...finalReturns) * 100,
      bestCase: Math.max(...finalReturns) * 100,
      probabilityOfLoss: (lossCount / simulations) * 100
    };
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(
    holdings: PortfolioHolding[],
    currentPrices: Map<string, number>,
    volatilities: StockVolatility[]
  ): PortfolioMetrics {
    const totalValue = holdings.reduce((sum, h) => {
      const currentPrice = currentPrices.get(h.symbol) || h.avgPrice;
      return sum + (h.shares * currentPrice);
    }, 0);

    const weights = holdings.map(h => {
      const currentPrice = currentPrices.get(h.symbol) || h.avgPrice;
      return (h.shares * currentPrice) / totalValue;
    });

    // Portfolio volatility
    const volatility = Math.sqrt(
      weights.reduce((sum, w, i) => {
        const vol = volatilities[i]?.dailyVolatility || 0.02;
        return sum + Math.pow(w * vol, 2);
      }, 0)
    ) * Math.sqrt(252); // Annualized

    // Diversification score (0-100, higher is better)
    const diversificationScore = Math.min(100, (holdings.length / 10) * 100 * (1 - this.calculateHHI(weights)));

    // Max drawdown (simplified)
    const returns = holdings.map((h, i) => {
      const currentPrice = currentPrices.get(h.symbol) || h.avgPrice;
      return (currentPrice - h.avgPrice) / h.avgPrice;
    });
    const maxDrawdown = Math.min(...returns) * 100;

    return {
      totalValue,
      volatility: volatility * 100,
      diversificationScore,
      maxDrawdown
    };
  }

  /**
   * Generate random return using normal distribution (Box-Muller transform)
   */
  private generateRandomReturn(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33
    };
    return zScores[confidenceLevel] || 1.65;
  }

  /**
   * Calculate Herfindahl-Hirschman Index for concentration
   */
  private calculateHHI(weights: number[]): number {
    return weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
  }

  /**
   * Calculate daily returns from price history
   */
  calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

export default new RiskCalculator();

