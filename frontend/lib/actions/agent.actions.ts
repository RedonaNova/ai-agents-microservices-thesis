"use server";

/**
 * Agent Actions - Interface to backend AI agents via API Gateway
 * Replaces direct Finnhub API calls with our consolidated backend agents
 */

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001';

// ============================================
// NEWS INTELLIGENCE AGENT
// ============================================

export interface NewsRequest {
  userId?: string;
  symbols?: string[];
  days?: number;
}

export interface NewsArticle {
  headline: string;
  summary?: string;
  source: string;
  url: string;
  datetime?: number;
  image?: string;
  related?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

export async function getNewsFromAgent(request: NewsRequest): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/agent/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: request.userId || 'guest',
        symbols: request.symbols || [],
        days: request.days || 7,
      }),
      cache: 'no-store', // Always get fresh news
    });

    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const data = await response.json();
    
    // If backend returns articles directly
    if (Array.isArray(data)) {
      return data;
    }
    
    // If backend returns wrapped response
    if (data.success && data.articles) {
      return data.articles;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch news from agent:', error);
    // Fallback to empty array instead of throwing
    return [];
  }
}

// ============================================
// INVESTMENT AGENT
// ============================================

export interface PortfolioRequest {
  userId: string;
  investmentAmount?: number;
  riskTolerance?: 'low' | 'medium' | 'high';
  preferences?: {
    sectors?: string[];
    timeHorizon?: 'short' | 'medium' | 'long';
  };
}

export interface MarketAnalysisRequest {
  userId: string;
}

export interface HistoricalAnalysisRequest {
  userId: string;
  symbol: string;
  period?: number;
}

export interface RiskAssessmentRequest {
  userId: string;
  symbols: string[];
  confidenceLevel?: number;
}

export async function getPortfolioAdvice(request: PortfolioRequest) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/agent/portfolio/advice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Portfolio API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get portfolio advice:', error);
    return { success: false, error: 'Failed to get portfolio advice' };
  }
}

export async function getMarketAnalysis(request: MarketAnalysisRequest) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/agent/market/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Market analysis API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get market analysis:', error);
    return { success: false, error: 'Failed to get market analysis' };
  }
}

export async function getHistoricalAnalysis(request: HistoricalAnalysisRequest) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/agent/historical/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Historical analysis API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get historical analysis:', error);
    return { success: false, error: 'Failed to get historical analysis' };
  }
}

export async function getRiskAssessment(request: RiskAssessmentRequest) {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/agent/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Risk assessment API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get risk assessment:', error);
    return { success: false, error: 'Failed to get risk assessment' };
  }
}

// ============================================
// REAL-TIME STREAMING (SSE)
// ============================================

export interface AgentStreamOptions {
  requestId: string;
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export async function streamAgentResponse(options: AgentStreamOptions) {
  const { requestId, onMessage, onError, onComplete } = options;
  
  const eventSource = new EventSource(
    `${API_GATEWAY_URL}/api/agent/stream/${requestId}`
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
      
      // Check if this is the final message
      if (data.status === 'completed' || data.status === 'error') {
        eventSource.close();
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
      if (onError) onError(error as Error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
    if (onError) onError(new Error('Stream connection error'));
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

