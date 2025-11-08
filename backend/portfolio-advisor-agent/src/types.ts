/**
 * Type definitions for Portfolio Advisor Agent
 */

// Agent request from orchestrator
export interface AgentRequest {
  requestId: string;
  userId: string;
  intent: string;
  originalMessage: string;
  parameters: Record<string, any>;
  context: {
    portfolio?: Portfolio;
    watchlist?: string[];
    preferences?: UserPreferences;
  };
  timestamp: string;
  sourceAgent: string;
}

// User portfolio
export interface Portfolio {
  userId: string;
  holdings: PortfolioHolding[];
  totalValue: number;
  cashBalance: number;
  lastUpdated: string;
}

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// User preferences
export interface UserPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  investmentGoals: string[];
  timeHorizon: 'short' | 'medium' | 'long';
  sectors?: string[];
}

// Stock data from database
export interface StockData {
  symbol: string;
  name: string;
  closingPrice: number;
  openingPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  tradeDate: string;
  marketSegment: string;
}

// Portfolio advice response
export interface PortfolioAdvice {
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  suggestedStocks?: StockRecommendation[];
  riskAnalysis?: string;
  diversificationAdvice?: string;
  actionItems?: string[];
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  action: 'buy' | 'sell' | 'hold';
  currentPrice: number;
  targetPrice?: number;
  reasoning: string;
  confidence: number;
}

// Agent response to user
export interface AgentResponse {
  requestId: string;
  agentName: string;
  success: boolean;
  data: PortfolioAdvice;
  message: string;
  error?: string;
  processingTime: number;
  timestamp: string;
}

// User response (final response to user)
export interface UserResponse {
  requestId: string;
  userId: string;
  success: boolean;
  message: string;
  data?: any;
  sources?: string[];
  processingTime: number;
  timestamp: string;
}

