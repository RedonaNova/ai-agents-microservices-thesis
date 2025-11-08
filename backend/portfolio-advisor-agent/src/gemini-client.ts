import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { PortfolioAdvice, StockData, Portfolio, UserPreferences, StockRecommendation } from './types';
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
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7, // Balanced for creative yet factual advice
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * Generate portfolio advice using Gemini
   */
  async generateAdvice(params: {
    userMessage: string;
    portfolio?: Portfolio;
    watchlist?: string[];
    preferences?: UserPreferences;
    marketData?: StockData[];
    topPerformers?: StockData[];
  }): Promise<PortfolioAdvice> {
    try {
      const prompt = this.buildAdvicePrompt(params);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse JSON response
      const advice = this.parseAdviceResponse(text);
      
      logger.info('Portfolio advice generated', { 
        userMessage: params.userMessage.substring(0, 50),
        confidence: advice.confidence 
      });

      return advice;
      
    } catch (error: any) {
      logger.error('Failed to generate portfolio advice', { error: error.message });
      
      // Fallback to basic advice
      return this.generateFallbackAdvice(params);
    }
  }

  /**
   * Build prompt for portfolio advice
   */
  private buildAdvicePrompt(params: {
    userMessage: string;
    portfolio?: Portfolio;
    watchlist?: string[];
    preferences?: UserPreferences;
    marketData?: StockData[];
    topPerformers?: StockData[];
  }): string {
    const { userMessage, portfolio, watchlist, preferences, marketData, topPerformers } = params;

    let prompt = `You are an expert financial advisor specializing in the Mongolian Stock Exchange (MSE).

User Question: "${userMessage}"

`;

    // Add portfolio context
    if (portfolio && portfolio.holdings.length > 0) {
      prompt += `\nCurrent Portfolio:
Total Value: ₮${portfolio.totalValue.toLocaleString()}
Cash Balance: ₮${portfolio.cashBalance.toLocaleString()}
Holdings:
${portfolio.holdings.map(h => 
  `- ${h.symbol}: ${h.quantity} shares @ ₮${h.averagePrice.toFixed(2)} (Current: ₮${h.currentPrice.toFixed(2)}, ${h.gainLossPercent > 0 ? '+' : ''}${h.gainLossPercent.toFixed(2)}%)`
).join('\n')}
`;
    }

    // Add watchlist
    if (watchlist && watchlist.length > 0) {
      prompt += `\nWatchlist: ${watchlist.join(', ')}
`;
    }

    // Add user preferences
    if (preferences) {
      prompt += `\nInvestment Profile:
- Risk Tolerance: ${preferences.riskTolerance}
- Time Horizon: ${preferences.timeHorizon}
- Goals: ${preferences.investmentGoals?.join(', ') || 'Not specified'}
`;
    }

    // Add market data
    if (marketData && marketData.length > 0) {
      prompt += `\nRelevant Market Data:
${marketData.map(s => 
  `- ${s.symbol} (${s.name}): ₮${Number(s.closingPrice).toFixed(2)} (${Number(s.changePercent) > 0 ? '+' : ''}${Number(s.changePercent).toFixed(2)}%, Vol: ${s.volume.toLocaleString()})`
).join('\n')}
`;
    }

    // Add top performers
    if (topPerformers && topPerformers.length > 0) {
      prompt += `\nTop Performing MSE Stocks Today:
${topPerformers.slice(0, 5).map(s => 
  `- ${s.symbol}: ${Number(s.changePercent) > 0 ? '+' : ''}${Number(s.changePercent).toFixed(2)}%`
).join('\n')}
`;
    }

    prompt += `

Provide investment advice in the following JSON format ONLY (no markdown):
{
  "recommendation": "buy|sell|hold",
  "confidence": 0.0 to 1.0,
  "reasoning": "Detailed explanation of your recommendation",
  "suggestedStocks": [
    {
      "symbol": "SYMBOL",
      "name": "Company Name",
      "action": "buy|sell|hold",
      "currentPrice": number,
      "targetPrice": number,
      "reasoning": "Why this stock?",
      "confidence": 0.0 to 1.0
    }
  ],
  "riskAnalysis": "Analysis of portfolio risks",
  "diversificationAdvice": "Suggestions for better diversification",
  "actionItems": ["Specific action 1", "Specific action 2"]
}

Important Guidelines:
- Base advice on actual market data provided
- Consider MSE-specific factors (mining, banking, insurance sectors)
- Be realistic about volatility and liquidity
- Mention currency (₮ - Mongolian Tugrik)
- Provide 2-4 specific stock recommendations if appropriate
- Include risk warnings
- Be conservative with confidence scores (0.6-0.8 is typical)
`;

    return prompt;
  }

  /**
   * Parse Gemini response
   */
  private parseAdviceResponse(text: string): PortfolioAdvice {
    try {
      // Remove markdown code blocks if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        recommendation: parsed.recommendation || 'hold',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No specific reasoning provided',
        suggestedStocks: parsed.suggestedStocks || [],
        riskAnalysis: parsed.riskAnalysis,
        diversificationAdvice: parsed.diversificationAdvice,
        actionItems: parsed.actionItems || []
      };
    } catch (error) {
      logger.warn('Failed to parse Gemini response, using fallback', { text: text.substring(0, 200) });
      
      // Extract text-based advice
      return {
        recommendation: 'hold',
        confidence: 0.5,
        reasoning: text.substring(0, 500),
        actionItems: ['Review the analysis above', 'Consider consulting a financial advisor']
      };
    }
  }

  /**
   * Generate fallback advice when Gemini fails
   */
  private generateFallbackAdvice(params: {
    userMessage: string;
    portfolio?: Portfolio;
    marketData?: StockData[];
    topPerformers?: StockData[];
  }): PortfolioAdvice {
    const { marketData, topPerformers } = params;

    const recommendations: StockRecommendation[] = [];
    
    // Suggest top performers if available
    if (topPerformers && topPerformers.length > 0) {
      const top = topPerformers[0];
      recommendations.push({
        symbol: top.symbol,
        name: top.name,
        action: 'buy',
        currentPrice: Number(top.closingPrice),
        reasoning: `Strong performer with ${Number(top.changePercent).toFixed(2)}% gain`,
        confidence: 0.6
      });
    }

    return {
      recommendation: 'hold',
      confidence: 0.4,
      reasoning: 'Unable to generate detailed advice at this time. The system is experiencing temporary issues. Please try again later or consult current market data.',
      suggestedStocks: recommendations,
      riskAnalysis: 'Always diversify your portfolio across multiple sectors',
      diversificationAdvice: 'Consider spreading investments across MSE sectors: banking, mining, insurance',
      actionItems: [
        'Monitor market conditions',
        'Review your risk tolerance',
        'Consider professional financial advice'
      ]
    };
  }
}

// Export singleton instance
export default new GeminiClient();

