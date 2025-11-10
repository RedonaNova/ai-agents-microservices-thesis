/**
 * Gemini AI Client for Investment Agent
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

// ============================================
// PROMPT TEMPLATES
// ============================================

const PORTFOLIO_ADVICE_PROMPT = `You are an expert investment advisor analyzing the Mongolian Stock Exchange (MSE).

USER REQUEST: {{userMessage}}

USER PREFERENCES:
{{preferences}}

USER PORTFOLIO:
{{portfolio}}

USER WATCHLIST:
{{watchlist}}

CURRENT MARKET DATA:
{{marketData}}

TOP PERFORMERS (for reference):
{{topPerformers}}

Provide personalized investment advice that:
1. Addresses the user's specific request/question
2. Considers their risk tolerance and investment goals
3. References specific stocks from MSE with current prices
4. Provides actionable recommendations (buy/sell/hold)
5. Explains the reasoning behind recommendations
6. Considers both their portfolio and watchlist

Format as clear, structured advice with specific stock recommendations.`;

const MARKET_ANALYSIS_PROMPT = `You are a market analyst specializing in the Mongolian Stock Exchange (MSE).

MARKET METRICS:
{{metrics}}

TOP PERFORMERS:
{{topPerformers}}

TOP LOSERS:
{{topLosers}}

SECTOR PERFORMANCE:
{{sectorPerformance}}

Provide a comprehensive market analysis that includes:
1. Overall market sentiment (bullish/bearish/neutral)
2. Key trends and patterns identified
3. Sector analysis - which sectors are strong/weak
4. Notable movers and potential reasons
5. Risk factors to watch
6. Opportunities for investors

Be specific with stock symbols and percentages. Format as a professional market report.`;

const HISTORICAL_ANALYSIS_PROMPT = `You are a technical analyst specializing in the Mongolian Stock Exchange (MSE).

STOCK SYMBOL: {{symbol}}
ANALYSIS PERIOD: {{period}} days

TECHNICAL INDICATORS:
{{indicators}}

PRICE DATA (last 30 days):
{{priceData}}

Provide a technical analysis that includes:
1. Trend analysis (uptrend/downtrend/sideways)
2. Support and resistance levels
3. Interpretation of technical indicators (SMA, RSI, MACD, Bollinger Bands)
4. Chart pattern recognition
5. Trading signals (bullish/bearish/neutral)
6. Price targets and stop-loss recommendations
7. Risk assessment for this specific stock

Be specific with price levels and provide clear trading guidance.`;

const RISK_ASSESSMENT_PROMPT = `You are a risk management specialist analyzing the Mongolian Stock Exchange (MSE).

PORTFOLIO SYMBOLS: {{symbols}}

RISK METRICS:
{{riskMetrics}}

Provide a comprehensive risk assessment that includes:
1. Overall portfolio risk level (low/medium/high)
2. Individual stock volatility analysis
3. Diversification assessment
4. Value at Risk (VaR) interpretation
5. Risk mitigation strategies
6. Position sizing recommendations
7. Hedging suggestions if applicable

Be specific about which stocks contribute most to portfolio risk and provide actionable advice.`;

// ============================================
// AI GENERATION FUNCTIONS
// ============================================

export async function generateInvestmentInsight(
  type: 'portfolio_advice' | 'market_analysis' | 'historical_analysis' | 'risk_assessment',
  data: any
): Promise<string> {
  try {
    let prompt = '';

    switch (type) {
      case 'portfolio_advice':
        prompt = PORTFOLIO_ADVICE_PROMPT
          .replace('{{userMessage}}', data.userMessage || 'General investment advice')
          .replace('{{preferences}}', JSON.stringify(data.preferences || {}, null, 2))
          .replace('{{portfolio}}', JSON.stringify(data.portfolio || { holdings: [] }, null, 2))
          .replace('{{watchlist}}', JSON.stringify(data.watchlist || [], null, 2))
          .replace('{{marketData}}', JSON.stringify(data.marketData || [], null, 2))
          .replace('{{topPerformers}}', JSON.stringify(data.topPerformers || [], null, 2));
        break;

      case 'market_analysis':
        prompt = MARKET_ANALYSIS_PROMPT
          .replace('{{metrics}}', JSON.stringify(data.metrics || {}, null, 2))
          .replace('{{topPerformers}}', JSON.stringify(data.topPerformers || [], null, 2))
          .replace('{{topLosers}}', JSON.stringify(data.topLosers || [], null, 2))
          .replace('{{sectorPerformance}}', JSON.stringify(data.sectorPerformance || [], null, 2));
        break;

      case 'historical_analysis':
        prompt = HISTORICAL_ANALYSIS_PROMPT
          .replace('{{symbol}}', data.symbol || 'UNKNOWN')
          .replace('{{period}}', String(data.period || 90))
          .replace('{{indicators}}', JSON.stringify(data.indicators || {}, null, 2))
          .replace('{{priceData}}', JSON.stringify(data.priceData || [], null, 2));
        break;

      case 'risk_assessment':
        prompt = RISK_ASSESSMENT_PROMPT
          .replace('{{symbols}}', JSON.stringify(data.symbols || [], null, 2))
          .replace('{{riskMetrics}}', JSON.stringify(data.riskMetrics || {}, null, 2));
        break;

      default:
        throw new Error(`Unknown insight type: ${type}`);
    }

    logger.info('Generating AI insight', { type, promptLength: prompt.length });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.info('AI insight generated', { 
      type, 
      responseLength: text.length 
    });

    return text;
  } catch (error) {
    logger.error('Failed to generate AI insight', { error, type });
    throw error;
  }
}

