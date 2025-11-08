/**
 * Consolidated Investment Service
 * Combines: Portfolio Advice, Market Analysis, Historical Analysis, Risk Assessment
 */

import database from './database';
import logger from './logger';
import { InvestmentRequest, InvestmentResponse, StockData } from './types';

// ============================================
// 1. PORTFOLIO ADVICE FUNCTIONS
// ============================================

async function getPortfolioAdvice(request: InvestmentRequest): Promise<any> {
  logger.info('Generating portfolio advice', { userId: request.userId });

  const userMessage = request.originalMessage || request.message || 'Get portfolio advice';
  const watchlist = request.context?.watchlist || [];

  // Get market data for watchlist
  const marketData = await getMarketData(watchlist);
  
  // Get top performers
  const topPerformers = await getTopPerformers(10);

  return {
    type: 'portfolio_advice',
    userMessage,
    marketData,
    topPerformers,
    preferences: request.context?.preferences,
    portfolio: request.context?.portfolio,
    watchlist
  };
}

// ============================================
// 2. MARKET ANALYSIS FUNCTIONS
// ============================================

async function getMarketAnalysis(request: InvestmentRequest): Promise<any> {
  logger.info('Generating market analysis', { userId: request.userId });

  // Get overall market metrics
  const metrics = await getMarketMetrics();
  
  // Get top performers and losers
  const topPerformers = await getTopPerformers(10);
  const topLosers = await getTopLosers(10);
  
  // Get sector performance
  const sectorPerformance = await getSectorPerformance();

  return {
    type: 'market_analysis',
    metrics,
    topPerformers,
    topLosers,
    sectorPerformance,
    analysisDate: new Date().toISOString()
  };
}

// ============================================
// 3. HISTORICAL ANALYSIS FUNCTIONS
// ============================================

async function getHistoricalAnalysis(request: InvestmentRequest): Promise<any> {
  logger.info('Generating historical analysis', { userId: request.userId });

  const symbol = request.parameters?.symbol || request.metadata?.symbol;
  const period = request.parameters?.period || 90; // days

  if (!symbol) {
    throw new Error('Symbol required for historical analysis');
  }

  // Get historical price data
  const priceData = await getHistoricalPrices(symbol, period);
  
  // Calculate technical indicators
  const indicators = calculateTechnicalIndicators(priceData);

  return {
    type: 'historical_analysis',
    symbol,
    period,
    priceData: priceData.slice(0, 30), // Last 30 days for response
    indicators,
    totalDataPoints: priceData.length
  };
}

// ============================================
// 4. RISK ASSESSMENT FUNCTIONS
// ============================================

async function getRiskAssessment(request: InvestmentRequest): Promise<any> {
  logger.info('Generating risk assessment', { userId: request.userId });

  const symbols = request.parameters?.symbols || request.context?.watchlist || [];
  
  if (symbols.length === 0) {
    throw new Error('Symbols required for risk assessment');
  }

  // Get price data for all symbols
  const portfolioData = await Promise.all(
    symbols.map(async (symbol: string) => {
      const prices = await getHistoricalPrices(symbol, 90);
      return { symbol, prices };
    })
  );

  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(portfolioData);

  return {
    type: 'risk_assessment',
    symbols,
    riskMetrics,
    assessmentDate: new Date().toISOString()
  };
}

// ============================================
// SHARED UTILITY FUNCTIONS
// ============================================

async function getMarketData(symbols: string[]): Promise<StockData[]> {
  if (symbols.length === 0) return [];

  const placeholders = symbols.map((_, i) => `$${i + 1}`).join(',');
  const query = `
    SELECT 
      th.symbol,
      c.name,
      th.closing_price::text,
      th.opening_price::text,
      th.high_price::text,
      th.low_price::text,
      th.volume::text,
      th.previous_close::text,
      (th.closing_price - th.previous_close)::text as change,
      ((th.closing_price - th.previous_close) / th.previous_close * 100)::text as change_percent,
      th.trade_date::text,
      c.market_segment
    FROM mse_trading_history th
    JOIN mse_companies c ON th.symbol = c.symbol
    WHERE th.symbol IN (${placeholders})
      AND th.trade_date = (
        SELECT MAX(trade_date) 
        FROM mse_trading_history 
        WHERE symbol = th.symbol
      )
    ORDER BY th.symbol;
  `;

  const result = await database.query(query, symbols);
  return result.rows;
}

async function getTopPerformers(limit: number = 10): Promise<StockData[]> {
  const query = `
    SELECT 
      th.symbol,
      c.name,
      th.closing_price::text,
      th.opening_price::text,
      th.high_price::text,
      th.low_price::text,
      th.volume::text,
      th.previous_close::text,
      (th.closing_price - th.previous_close)::text as change,
      ((th.closing_price - th.previous_close) / th.previous_close * 100)::text as change_percent,
      th.trade_date::text,
      c.market_segment
    FROM mse_trading_history th
    JOIN mse_companies c ON th.symbol = c.symbol
    WHERE th.trade_date = (
      SELECT MAX(trade_date) FROM mse_trading_history WHERE symbol = th.symbol
    )
    AND th.previous_close > 0
    ORDER BY ((th.closing_price - th.previous_close) / th.previous_close) DESC
    LIMIT $1;
  `;

  const result = await database.query(query, [limit]);
  return result.rows;
}

async function getTopLosers(limit: number = 10): Promise<StockData[]> {
  const query = `
    SELECT 
      th.symbol,
      c.name,
      th.closing_price::text,
      th.opening_price::text,
      th.high_price::text,
      th.low_price::text,
      th.volume::text,
      th.previous_close::text,
      (th.closing_price - th.previous_close)::text as change,
      ((th.closing_price - th.previous_close) / th.previous_close * 100)::text as change_percent,
      th.trade_date::text,
      c.market_segment
    FROM mse_trading_history th
    JOIN mse_companies c ON th.symbol = c.symbol
    WHERE th.trade_date = (
      SELECT MAX(trade_date) FROM mse_trading_history WHERE symbol = th.symbol
    )
    AND th.previous_close > 0
    ORDER BY ((th.closing_price - th.previous_close) / th.previous_close) ASC
    LIMIT $1;
  `;

  const result = await database.query(query, [limit]);
  return result.rows;
}

async function getMarketMetrics(): Promise<any> {
  const query = `
    SELECT 
      COUNT(DISTINCT th.symbol) as total_stocks,
      SUM(th.volume)::text as total_volume,
      AVG((th.closing_price - th.previous_close) / th.previous_close * 100)::numeric(10,2) as avg_change_percent,
      COUNT(CASE WHEN th.closing_price > th.previous_close THEN 1 END) as gainers,
      COUNT(CASE WHEN th.closing_price < th.previous_close THEN 1 END) as losers,
      COUNT(CASE WHEN th.closing_price = th.previous_close THEN 1 END) as unchanged
    FROM mse_trading_history th
    WHERE th.trade_date = (SELECT MAX(trade_date) FROM mse_trading_history)
    AND th.previous_close > 0;
  `;

  const result = await database.query(query);
  return result.rows[0] || {};
}

async function getSectorPerformance(): Promise<any[]> {
  const query = `
    SELECT 
      c.market_segment as sector,
      COUNT(*) as stock_count,
      AVG((th.closing_price - th.previous_close) / th.previous_close * 100)::numeric(10,2) as avg_change_percent,
      SUM(th.volume)::text as total_volume
    FROM mse_trading_history th
    JOIN mse_companies c ON th.symbol = c.symbol
    WHERE th.trade_date = (SELECT MAX(trade_date) FROM mse_trading_history)
    AND th.previous_close > 0
    GROUP BY c.market_segment
    ORDER BY avg_change_percent DESC;
  `;

  const result = await database.query(query);
  return result.rows;
}

async function getHistoricalPrices(symbol: string, days: number): Promise<any[]> {
  const query = `
    SELECT 
      trade_date::text,
      closing_price::numeric as close,
      opening_price::numeric as open,
      high_price::numeric as high,
      low_price::numeric as low,
      volume::numeric as volume
    FROM mse_trading_history
    WHERE symbol = $1
    ORDER BY trade_date DESC
    LIMIT $2;
  `;

  const result = await database.query(query, [symbol, days]);
  return result.rows.reverse(); // Oldest to newest
}

function calculateTechnicalIndicators(priceData: any[]): any {
  const closes = priceData.map(d => Number(d.close));
  
  // Simple Moving Average (SMA)
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  
  // RSI
  const rsi = calculateRSI(closes, 14);
  
  // MACD
  const macd = calculateMACD(closes);
  
  // Bollinger Bands
  const bollinger = calculateBollingerBands(closes, 20, 2);

  return {
    sma: { sma20, sma50 },
    rsi: { current: rsi[rsi.length - 1], history: rsi.slice(-14) },
    macd: { current: macd[macd.length - 1], history: macd.slice(-14) },
    bollinger: { current: bollinger[bollinger.length - 1], history: bollinger.slice(-14) }
  };
}

function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(0);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return [0, ...rsi]; // Prepend 0 for first data point
}

function calculateMACD(data: number[]): any[] {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12.map((val, i) => val - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((val, i) => val - signalLine[i]);

  return macdLine.map((_, i) => ({
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: histogram[i]
  }));
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }

  return ema;
}

function calculateBollingerBands(data: number[], period: number, stdDev: number): any[] {
  const sma = calculateSMA(data, period);
  const bands: any[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: 0, middle: 0, lower: 0 });
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);

      bands.push({
        upper: mean + (stdDev * sd),
        middle: mean,
        lower: mean - (stdDev * sd)
      });
    }
  }

  return bands;
}

function calculateRiskMetrics(portfolioData: any[]): any {
  // Calculate volatility for each stock
  const stockMetrics = portfolioData.map(({ symbol, prices }) => {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnRate = (Number(prices[i].close) - Number(prices[i - 1].close)) / Number(prices[i - 1].close);
      returns.push(returnRate);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    // VaR (95% confidence)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95 = sortedReturns[Math.floor(sortedReturns.length * 0.05)];

    return {
      symbol,
      volatility: (volatility * 100).toFixed(2) + '%',
      meanReturn: (mean * 100).toFixed(2) + '%',
      var95: (var95 * 100).toFixed(2) + '%',
      dataPoints: prices.length
    };
  });

  // Portfolio-level metrics
  const avgVolatility = stockMetrics.reduce((sum, m) => sum + parseFloat(m.volatility), 0) / stockMetrics.length;

  return {
    stocks: stockMetrics,
    portfolio: {
      averageVolatility: avgVolatility.toFixed(2) + '%',
      riskLevel: avgVolatility > 40 ? 'High' : avgVolatility > 20 ? 'Medium' : 'Low'
    }
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function handleInvestmentRequest(request: InvestmentRequest): Promise<any> {
  const startTime = Date.now();

  try {
    let data: any;

    switch (request.type) {
      case 'portfolio_advice':
        data = await getPortfolioAdvice(request);
        break;
      case 'market_analysis':
        data = await getMarketAnalysis(request);
        break;
      case 'historical_analysis':
        data = await getHistoricalAnalysis(request);
        break;
      case 'risk_assessment':
        data = await getRiskAssessment(request);
        break;
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }

    const processingTime = Date.now() - startTime;

    logger.info('Investment request processed', {
      type: request.type,
      processingTime: `${processingTime}ms`
    });

    return {
      ...data,
      processingTime
    };
  } catch (error) {
    logger.error('Investment request failed', { error, type: request.type });
    throw error;
  }
}

