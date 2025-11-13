import geminiClient from './gemini-client';
import logger from './logger';

/**
 * Intent Classifier
 * 
 * Uses Gemini LLM to classify user intent
 */

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a stock market analysis platform.

Classify the user's query into ONE of these intents:
- portfolio: Portfolio analysis, investment advice, allocation recommendations
- market_analysis: Market trends, sector analysis, overall market conditions
- news: Latest news, news sentiment, company announcements
- risk_assessment: Risk analysis, volatility, VaR calculations
- historical_analysis: Historical data, technical analysis, price history
- general_query: General questions about stocks or markets

Respond with ONLY the intent name (e.g., "portfolio"), nothing else.

User query: {QUERY}

Intent:`;

class IntentClassifier {
  private cache: Map<string, string> = new Map();

  /**
   * Classify user intent using Gemini LLM
   */
  async classify(query: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.cache.get(query.toLowerCase());
      if (cached) {
        logger.debug('Intent retrieved from cache', { query, intent: cached });
        return cached;
      }

      // Use Gemini for classification
      const prompt = INTENT_CLASSIFICATION_PROMPT.replace('{QUERY}', query);
      const response = await geminiClient.generateResponse(prompt, 0.3);
      
      // Extract intent
      const intent = response.trim().toLowerCase();
      
      // Validate intent
      const validIntents = [
        'portfolio',
        'market_analysis',
        'news',
        'risk_assessment',
        'historical_analysis',
        'general_query',
      ];

      const finalIntent = validIntents.includes(intent) ? intent : 'general_query';
      
      // Cache result
      this.cache.set(query.toLowerCase(), finalIntent);
      
      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      logger.info('Intent classified', { query, intent: finalIntent });
      return finalIntent;

    } catch (error: any) {
      logger.error('Intent classification failed', { error: error.message });
      
      // Fallback: keyword-based classification
      return this.fallbackClassify(query);
    }
  }

  /**
   * Fallback classification using keywords
   */
  private fallbackClassify(query: string): string {
    const queryLower = query.toLowerCase();

    const keywords = {
      portfolio: ['invest', 'portfolio', 'buy', 'sell', 'allocation', 'diversif', 'хөрөнгө оруулалт'],
      market_analysis: ['market', 'trend', 'sector', 'index', 'зах зээл', 'trend'],
      news: ['news', 'мэдээ', 'headline', 'announcement', 'сонин'],
      risk_assessment: ['risk', 'volatility', 'var', 'эрсдэл', 'хэлбэлзэл'],
      historical_analysis: ['historical', 'history', 'past', 'chart', 'түүх'],
    };

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some(keyword => queryLower.includes(keyword))) {
        logger.info('Intent classified (fallback)', { query, intent });
        return intent;
      }
    }

    return 'general_query';
  }
}

const intentClassifier = new IntentClassifier();

export default intentClassifier;

