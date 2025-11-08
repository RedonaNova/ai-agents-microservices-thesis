import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { TechnicalIndicators, PricePoint, ChartPattern } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class GeminiClient {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async analyzeHistoricalData(
    symbol: string,
    indicators: TechnicalIndicators,
    priceHistory: PricePoint[]
  ): Promise<{ summary: string; patterns: ChartPattern[]; recommendation: string; insights: string[] }> {
    const latestPrice = priceHistory[priceHistory.length - 1];
    const oldestPrice = priceHistory[0];
    const priceChange = ((latestPrice.close - oldestPrice.close) / oldestPrice.close * 100);

    const prompt = `You are a technical analyst for the Mongolian Stock Exchange. Analyze ${symbol} with the following data:

PRICE HISTORY (${priceHistory.length} days):
- Start: ${oldestPrice.close.toFixed(2)} MNT (${oldestPrice.date})
- Latest: ${latestPrice.close.toFixed(2)} MNT (${latestPrice.date})
- Change: ${priceChange.toFixed(2)}%

TECHNICAL INDICATORS:
${indicators.sma20 ? `- SMA 20: ${Number(indicators.sma20).toFixed(2)} MNT` : ''}
${indicators.sma50 ? `- SMA 50: ${Number(indicators.sma50).toFixed(2)} MNT` : ''}
${indicators.sma200 ? `- SMA 200: ${Number(indicators.sma200).toFixed(2)} MNT` : ''}
${indicators.rsi ? `- RSI (14): ${Number(indicators.rsi).toFixed(2)}` : ''}
${indicators.macd ? `- MACD: ${Number(indicators.macd.macd).toFixed(2)}, Signal: ${Number(indicators.macd.signal).toFixed(2)}` : ''}
${indicators.bollingerBands ? `- Bollinger Bands: Upper ${Number(indicators.bollingerBands.upper).toFixed(2)}, Middle ${Number(indicators.bollingerBands.middle).toFixed(2)}, Lower ${Number(indicators.bollingerBands.lower).toFixed(2)}` : ''}

Current Price vs Indicators:
${indicators.sma20 ? `- vs SMA20: ${latestPrice.close > indicators.sma20 ? 'ABOVE' : 'BELOW'}` : ''}
${indicators.sma50 ? `- vs SMA50: ${latestPrice.close > indicators.sma50 ? 'ABOVE' : 'BELOW'}` : ''}

Provide:
1. Technical analysis summary (2-3 sentences)
2. Chart patterns detected (2-3 patterns with confidence level)
3. Trading recommendation (BUY/HOLD/SELL with rationale)
4. Key insights (3-4 actionable points)

Format as JSON:
{
  "summary": "...",
  "patterns": [{"pattern": "...", "confidence": "high|medium|low", "description": "..."}],
  "recommendation": "...",
  "insights": ["...", "...", "..."]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info('Generated historical analysis successfully');
        return parsed;
      }
      
      return this.generateFallbackAnalysis(symbol, indicators, latestPrice.close, priceChange);
    } catch (error: any) {
      logger.error(`Gemini API error: ${error.message}`);
      return this.generateFallbackAnalysis(symbol, indicators, latestPrice.close, priceChange);
    }
  }

  private generateFallbackAnalysis(
    symbol: string,
    indicators: TechnicalIndicators,
    currentPrice: number,
    priceChange: number
  ): { summary: string; patterns: ChartPattern[]; recommendation: string; insights: string[] } {
    const rsi = indicators.rsi || 50;
    const trend = priceChange > 0 ? 'uptrend' : 'downtrend';
    
    let recommendation = 'HOLD';
    if (rsi < 30 && priceChange < -5) recommendation = 'BUY';
    else if (rsi > 70 && priceChange > 5) recommendation = 'SELL';

    return {
      summary: `${symbol} shows a ${trend} with ${priceChange.toFixed(2)}% change. RSI at ${rsi.toFixed(2)} indicates ${rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral'} conditions.`,
      patterns: [
        {
          pattern: priceChange > 0 ? 'Bullish Trend' : 'Bearish Trend',
          confidence: Math.abs(priceChange) > 5 ? 'high' : 'medium',
          description: `Price has moved ${priceChange.toFixed(2)}% over the analyzed period`
        }
      ],
      recommendation: `${recommendation}: ${recommendation === 'BUY' ? 'Potential entry point at oversold levels' : recommendation === 'SELL' ? 'Consider profit-taking at overbought levels' : 'Monitor for clearer signals'}`,
      insights: [
        `Current price: ${currentPrice.toFixed(2)} MNT`,
        `RSI: ${rsi.toFixed(2)} - ${rsi < 30 ? 'Oversold territory' : rsi > 70 ? 'Overbought territory' : 'Neutral range'}`,
        indicators.sma20 ? `Price is ${currentPrice > indicators.sma20 ? 'above' : 'below'} 20-day SMA` : 'Insufficient data for SMA analysis',
        `Overall trend: ${trend.toUpperCase()}`
      ]
    };
  }
}

export default new GeminiClient();

