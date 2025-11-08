import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { VaRAnalysis, MonteCarloResults, PortfolioMetrics } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class GeminiClient {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async generateRiskInsights(
    varAnalysis: VaRAnalysis,
    monteCarloResults: MonteCarloResults,
    portfolioMetrics: PortfolioMetrics
  ): Promise<{ summary: string; riskLevel: 'low' | 'medium' | 'high' | 'very-high'; recommendations: string[]; insights: string[] }> {
    const prompt = `You are a risk management advisor for the Mongolian Stock Exchange. Analyze the following portfolio risk metrics:

VALUE AT RISK (VaR) at ${(varAnalysis.confidenceLevel * 100).toFixed(0)}% confidence:
- 1-Day VaR: ${Number(varAnalysis.oneDay).toFixed(0)} MNT
- 1-Week VaR: ${Number(varAnalysis.oneWeek).toFixed(0)} MNT
- 1-Month VaR: ${Number(varAnalysis.oneMonth).toFixed(0)} MNT

MONTE CARLO SIMULATION (${monteCarloResults.simulations} simulations):
- Expected Return: ${Number(monteCarloResults.expectedReturn).toFixed(2)}%
- Best Case: ${Number(monteCarloResults.bestCase).toFixed(2)}%
- Worst Case: ${Number(monteCarloResults.worstCase).toFixed(2)}%
- Probability of Loss: ${Number(monteCarloResults.probabilityOfLoss).toFixed(2)}%

PORTFOLIO METRICS:
- Total Value: ${Number(portfolioMetrics.totalValue).toFixed(0)} MNT
- Volatility: ${Number(portfolioMetrics.volatility).toFixed(2)}%
- Max Drawdown: ${Number(portfolioMetrics.maxDrawdown).toFixed(2)}%
- Diversification Score: ${Number(portfolioMetrics.diversificationScore).toFixed(0)}/100

Provide:
1. Risk summary (2-3 sentences)
2. Overall risk level (low/medium/high/very-high)
3. Risk management recommendations (3-4 points)
4. Key insights (3-4 actionable points)

Format as JSON:
{
  "summary": "...",
  "riskLevel": "low|medium|high|very-high",
  "recommendations": ["...", "...", "..."],
  "insights": ["...", "...", "..."]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info('Generated risk assessment insights successfully');
        return parsed;
      }
      
      return this.generateFallbackInsights(varAnalysis, monteCarloResults, portfolioMetrics);
    } catch (error: any) {
      logger.error(`Gemini API error: ${error.message}`);
      return this.generateFallbackInsights(varAnalysis, monteCarloResults, portfolioMetrics);
    }
  }

  private generateFallbackInsights(
    varAnalysis: VaRAnalysis,
    monteCarloResults: MonteCarloResults,
    portfolioMetrics: PortfolioMetrics
  ): { summary: string; riskLevel: 'low' | 'medium' | 'high' | 'very-high'; recommendations: string[]; insights: string[] } {
    const volatility = portfolioMetrics.volatility;
    const probLoss = monteCarloResults.probabilityOfLoss;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'very-high' = 'medium';
    if (volatility > 30 || probLoss > 60) riskLevel = 'very-high';
    else if (volatility > 20 || probLoss > 45) riskLevel = 'high';
    else if (volatility < 10 && probLoss < 30) riskLevel = 'low';

    return {
      summary: `Portfolio shows ${riskLevel} risk with ${volatility.toFixed(2)}% volatility. VaR analysis indicates potential 1-day loss of ${varAnalysis.oneDay.toFixed(0)} MNT at ${(varAnalysis.confidenceLevel * 100).toFixed(0)}% confidence. Monte Carlo simulation shows ${probLoss.toFixed(1)}% probability of loss.`,
      riskLevel,
      recommendations: [
        riskLevel === 'very-high' || riskLevel === 'high' 
          ? 'Consider reducing position sizes to lower overall portfolio risk'
          : 'Current risk level is manageable for most investors',
        portfolioMetrics.diversificationScore < 50
          ? 'Improve diversification by adding more uncorrelated assets'
          : 'Diversification is adequate',
        `Set stop-loss orders at ${(Math.abs(portfolioMetrics.maxDrawdown) * 1.5).toFixed(0)}% to limit downside risk`,
        monteCarloResults.expectedReturn < 0
          ? 'Expected return is negative - consider portfolio rebalancing'
          : 'Expected return is positive - maintain current strategy with regular monitoring'
      ],
      insights: [
        `Portfolio volatility: ${volatility.toFixed(2)}% (annualized)`,
        `1-day VaR: ${varAnalysis.oneDay.toFixed(0)} MNT at ${(varAnalysis.confidenceLevel * 100).toFixed(0)}% confidence`,
        `Probability of loss: ${probLoss.toFixed(1)}% (based on ${monteCarloResults.simulations} simulations)`,
        `Diversification score: ${portfolioMetrics.diversificationScore.toFixed(0)}/100 ${portfolioMetrics.diversificationScore < 50 ? '- needs improvement' : '- good'}`
      ]
    };
  }
}

export default new GeminiClient();

