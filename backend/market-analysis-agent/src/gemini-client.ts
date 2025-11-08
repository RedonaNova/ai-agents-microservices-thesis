import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { StockPerformance } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class GeminiClient {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async generateMarketInsights(
    topPerformers: StockPerformance[],
    bottomPerformers: StockPerformance[],
    stats: { total: number; gainers: number; losers: number; avgChange: number }
  ): Promise<string> {
    const prompt = `You are a market analyst for the Mongolian Stock Exchange (MSE). Analyze the following market data:

MARKET STATISTICS:
- Total Companies: ${stats.total}
- Gainers: ${stats.gainers}
- Losers: ${stats.losers}
- Average Change: ${Number(stats.avgChange).toFixed(2)}%

TOP PERFORMERS:
${topPerformers.map((s, i) => `${i + 1}. ${s.companyName} (${s.symbol}): ${Number(s.closingPrice).toFixed(2)} MNT, ${Number(s.changePercent).toFixed(2)}% (${Number(s.change).toFixed(2)}) | Volume: ${s.volume}`).join('\n')}

BOTTOM PERFORMERS:
${bottomPerformers.map((s, i) => `${i + 1}. ${s.companyName} (${s.symbol}): ${Number(s.closingPrice).toFixed(2)} MNT, ${Number(s.changePercent).toFixed(2)}% (${Number(s.change).toFixed(2)}) | Volume: ${s.volume}`).join('\n')}

Provide a concise market analysis with:
1. Overall market sentiment
2. Key drivers and trends
3. Notable observations
4. Trading opportunities

Keep your response professional, data-driven, and actionable.`;

    try {
      const result = await this.model.generateContent(prompt);
      const insights = result.response.text();
      logger.info('Generated market insights successfully');
      return insights;
    } catch (error: any) {
      logger.error(`Gemini API error: ${error.message}`);
      return this.generateFallbackInsights(topPerformers, bottomPerformers, stats);
    }
  }

  private generateFallbackInsights(
    topPerformers: StockPerformance[],
    bottomPerformers: StockPerformance[],
    stats: any
  ): string {
    const marketSentiment = stats.avgChange > 0.5 ? 'bullish' : stats.avgChange < -0.5 ? 'bearish' : 'neutral';
    return `**Market Overview**: The Mongolian Stock Exchange shows ${marketSentiment} sentiment with ${stats.gainers} gainers vs ${stats.losers} losers.

**Top Performer**: ${topPerformers[0]?.companyName} leads with ${Number(topPerformers[0]?.changePercent).toFixed(2)}% gain.

**Bottom Performer**: ${bottomPerformers[0]?.companyName} declined ${Number(bottomPerformers[0]?.changePercent).toFixed(2)}%.

**Recommendation**: Monitor high-volume stocks for trading opportunities. Market average change is ${Number(stats.avgChange).toFixed(2)}%.`;
  }
}

export default new GeminiClient();

