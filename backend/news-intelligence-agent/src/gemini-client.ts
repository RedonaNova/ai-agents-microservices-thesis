import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { NewsArticle } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class GeminiClient {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  async analyzeNews(symbols: string[]): Promise<{ articles: NewsArticle[]; marketImpact: string; keyTopics: string[] }> {
    const prompt = `You are a financial news analyst for the Mongolian Stock Exchange (MSE). Generate a simulated news intelligence report for the following companies: ${symbols.join(', ')}.

Create 5-7 realistic news articles with:
1. Title (relevant to MSE companies)
2. Source (e.g., Mongolian news outlets, financial press)
3. Sentiment (positive/neutral/negative)
4. Impact level (high/medium/low)
5. Brief summary (2-3 sentences)

Format your response as JSON:
{
  "articles": [
    {
      "title": "...",
      "source": "...",
      "publishedAt": "2024-01-XX",
      "sentiment": "positive|neutral|negative",
      "relevantSymbols": ["SYMBOL"],
      "summary": "...",
      "impact": "high|medium|low"
    }
  ],
  "marketImpact": "Overall market impact analysis...",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info(`Generated ${parsed.articles?.length || 0} news articles`);
        return parsed;
      }
      
      return this.generateFallbackNews(symbols);
    } catch (error: any) {
      logger.error(`Gemini API error: ${error.message}`);
      return this.generateFallbackNews(symbols);
    }
  }

  private generateFallbackNews(symbols: string[]): { articles: NewsArticle[]; marketImpact: string; keyTopics: string[] } {
    const articles: NewsArticle[] = [
      {
        title: `${symbols[0] || 'MSE Companies'} Reports Strong Q4 Performance`,
        source: 'MSE Financial News',
        publishedAt: new Date().toISOString().split('T')[0],
        sentiment: 'positive',
        relevantSymbols: symbols.slice(0, 2),
        summary: `Leading MSE companies show positive growth trends. Market analysts expect continued momentum in the mining and financial sectors.`,
        impact: 'medium'
      },
      {
        title: 'Mongolian Stock Market Sees Increased Foreign Investment',
        source: 'Bloomberg Mongolia',
        publishedAt: new Date().toISOString().split('T')[0],
        sentiment: 'positive',
        relevantSymbols: symbols,
        summary: `Foreign investors show growing interest in MSE-listed companies, particularly in natural resources and banking sectors.`,
        impact: 'high'
      },
      {
        title: 'Market Volatility Expected Due to Global Economic Concerns',
        source: 'Financial Times',
        publishedAt: new Date().toISOString().split('T')[0],
        sentiment: 'neutral',
        relevantSymbols: symbols,
        summary: `Global economic uncertainty may impact MSE performance. Analysts recommend diversified portfolio strategies.`,
        impact: 'medium'
      }
    ];

    return {
      articles,
      marketImpact: 'Mixed sentiment with cautious optimism. Strong company fundamentals offset by global economic concerns.',
      keyTopics: ['Earnings Reports', 'Foreign Investment', 'Market Volatility']
    };
  }
}

export default new GeminiClient();

