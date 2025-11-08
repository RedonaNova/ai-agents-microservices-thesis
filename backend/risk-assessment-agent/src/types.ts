export interface UserRequest {
  requestId: string;
  userId: string;
  intent: string;
  message: string;
  metadata?: {
    portfolio?: PortfolioHolding[];
    timeHorizon?: number;
    confidenceLevel?: number;
  };
  timestamp: string;
}

export interface AgentResponse {
  requestId: string;
  userId: string;
  agent: string;
  status: 'success' | 'error';
  data?: RiskAssessmentReport;
  message?: string;
  timestamp: string;
}

export interface RiskAssessmentReport {
  summary: string;
  valueAtRisk: VaRAnalysis;
  monteCarloSimulation: MonteCarloResults;
  portfolioMetrics: PortfolioMetrics;
  riskLevel: 'low' | 'medium' | 'high' | 'very-high';
  recommendations: string[];
  insights: string[];
}

export interface VaRAnalysis {
  oneDay: number;
  oneWeek: number;
  oneMonth: number;
  confidenceLevel: number;
  interpretation: string;
}

export interface MonteCarloResults {
  simulations: number;
  expectedReturn: number;
  worstCase: number;
  bestCase: number;
  probabilityOfLoss: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  volatility: number;
  sharpeRatio?: number;
  beta?: number;
  maxDrawdown: number;
  diversificationScore: number;
}

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
}

export interface StockVolatility {
  symbol: string;
  dailyVolatility: number;
  returns: number[];
}

