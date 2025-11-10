import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent intent classification
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });
  }

  /**
   * Classify user intent using Gemini
   */
  async classifyIntent(userMessage: string, context?: any): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    reasoning: string;
  }> {
    try {
      const prompt = this.buildClassificationPrompt(userMessage, context);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const parsed = this.parseIntentResponse(text);
      
      logger.info('Intent classified', { 
        message: userMessage.substring(0, 50),
        intent: parsed.intent,
        confidence: parsed.confidence 
      });

      return parsed;
      
    } catch (error: any) {
      logger.error('Failed to classify intent', { error: error.message });
      
      // Fallback to simple keyword matching
      return this.fallbackIntentClassification(userMessage);
    }
  }

  /**
   * Build system prompt for intent classification
   */
  private buildClassificationPrompt(userMessage: string, context?: any): string {
    return `You are an intelligent intent classifier for a stock market analysis platform.

Available Intents:
1. **portfolio_advice** - User wants portfolio recommendations, investment advice, or portfolio analysis
2. **market_analysis** - User wants to understand market trends, sector performance, or market overview
3. **news_query** - User wants latest news, news about specific stocks, or sentiment analysis
4. **historical_analysis** - User wants historical price data, technical indicators, or chart analysis
5. **risk_assessment** - User wants risk metrics, volatility analysis, or risk management advice
6. **general_query** - General questions about stocks, how to invest, definitions, etc.

User Message: "${userMessage}"

${context ? `Context: ${JSON.stringify(context)}` : ''}

Analyze the user's intent and respond with ONLY a JSON object in this exact format:
{
  "intent": "one of the intents above",
  "confidence": 0.0 to 1.0,
  "entities": {
    "stocks": ["SYMBOL1", "SYMBOL2"],
    "timeframe": "1d|1w|1m|1y|all",
    "amount": number,
    "sector": "technology|finance|energy|etc"
  },
  "reasoning": "brief explanation"
}

Important:
- Only include entities that are explicitly mentioned
- Be strict with intent classification
- If multiple intents apply, choose the primary one
- confidence should reflect certainty`;
  }

  /**
   * Parse Gemini response
   */
  private parseIntentResponse(text: string): {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    reasoning: string;
  } {
    try {
      // Remove markdown code blocks if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        intent: parsed.intent || 'general_query',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      logger.warn('Failed to parse Gemini response, using fallback', { text });
      return {
        intent: 'general_query',
        confidence: 0.3,
        entities: {},
        reasoning: 'Parse error, fallback used'
      };
    }
  }

  /**
   * Fallback intent classification using keywords
   */
  private fallbackIntentClassification(message: string): {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    reasoning: string;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Portfolio keywords
    if (lowerMessage.match(/portfolio|invest|buy|sell|recommendation|should i/)) {
      return {
        intent: 'portfolio_advice',
        confidence: 0.6,
        entities: {},
        reasoning: 'Keyword match: portfolio-related terms'
      };
    }
    
    // Market analysis keywords
    if (lowerMessage.match(/market|trend|sector|industry|performance|overview/)) {
      return {
        intent: 'market_analysis',
        confidence: 0.6,
        entities: {},
        reasoning: 'Keyword match: market analysis terms'
      };
    }
    
    // News keywords
    if (lowerMessage.match(/news|article|announcement|press|headline/)) {
      return {
        intent: 'news_query',
        confidence: 0.6,
        entities: {},
        reasoning: 'Keyword match: news-related terms'
      };
    }
    
    // Historical keywords
    if (lowerMessage.match(/history|historical|chart|technical|indicator|rsi|macd/)) {
      return {
        intent: 'historical_analysis',
        confidence: 0.6,
        entities: {},
        reasoning: 'Keyword match: historical analysis terms'
      };
    }
    
    // Risk keywords
    if (lowerMessage.match(/risk|volatility|var|hedge|diversif/)) {
      return {
        intent: 'risk_assessment',
        confidence: 0.6,
        entities: {},
        reasoning: 'Keyword match: risk-related terms'
      };
    }
    
    // Default to general query
    return {
      intent: 'general_query',
      confidence: 0.5,
      entities: {},
      reasoning: 'No specific keywords matched, defaulting to general query'
    };
  }

  /**
   * Generate a response for the user (used by specialized agents)
   */
  async generateResponse(prompt: string, temperature: number = 0.7): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
      
    } catch (error: any) {
      logger.error('Failed to generate response', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export default new GeminiClient();

