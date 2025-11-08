export interface UserRequest {
  requestId: string;
  userId: string;
  intent: string;
  message: string;
  metadata?: {
    symbols?: string[];
    timeframe?: string;
  };
  timestamp: string;
}

export interface AgentResponse {
  requestId: string;
  userId: string;
  agent: string;
  status: 'success' | 'error';
  data?: NewsIntelligenceReport;
  message?: string;
  timestamp: string;
}

export interface NewsIntelligenceReport {
  summary: string;
  articles: NewsArticle[];
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  keyTopics: string[];
  marketImpact: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevantSymbols: string[];
  summary: string;
  impact: 'high' | 'medium' | 'low';
}

