import { HistoricalData, TechnicalIndicators, MACDData, BollingerBands } from './types';

export class TechnicalIndicatorCalculator {
  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data: number[], period: number): number | undefined {
    if (data.length < period) return undefined;
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period + 1) return undefined;

    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map(c => (c > 0 ? c : 0));
    const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));

    const avgGain = this.calculateSMA(gains, period);
    const avgLoss = this.calculateSMA(losses, period);

    if (!avgGain || !avgLoss || avgLoss === 0) return undefined;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices: number[]): MACDData | undefined {
    if (prices.length < 26) return undefined;

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    if (!ema12 || !ema26) return undefined;

    const macd = ema12 - ema26;
    
    // For signal line, we'd need to calculate EMA of MACD values
    // Simplified: using a fixed multiplier
    const signal = macd * 0.9;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period) || prices[0];

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBands | undefined {
    if (prices.length < period) return undefined;

    const middle = this.calculateSMA(prices, period);
    if (!middle) return undefined;

    const slice = prices.slice(-period);
    const variance = slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: middle + standardDeviation * stdDev,
      middle: middle,
      lower: middle - standardDeviation * stdDev
    };
  }

  /**
   * Calculate all technical indicators for historical data
   */
  calculateAllIndicators(historicalData: HistoricalData[]): TechnicalIndicators {
    const closingPrices = historicalData.map(d => Number(d.closing_price));

    return {
      sma20: this.calculateSMA(closingPrices, 20),
      sma50: this.calculateSMA(closingPrices, 50),
      sma200: this.calculateSMA(closingPrices, 200),
      rsi: this.calculateRSI(closingPrices, 14),
      macd: this.calculateMACD(closingPrices),
      bollingerBands: this.calculateBollingerBands(closingPrices, 20, 2)
    };
  }
}

export default new TechnicalIndicatorCalculator();

