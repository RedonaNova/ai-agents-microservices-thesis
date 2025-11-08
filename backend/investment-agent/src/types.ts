/**
 * Consolidated Investment Agent Types
 */

// Request types
export type InvestmentRequestType = 
  | 'portfolio_advice'
  | 'market_analysis' 
  | 'historical_analysis'
  | 'risk_assessment';

// Unified investment request
export interface InvestmentRequest {
  requestId: string;
  userId: string;
  type: InvestmentRequestType;
  message?: string;
  originalMessage?: string;
  metadata?: Record<string, any>;
  parameters?: Record<string, any>;
  context?: {
    portfolio?: Portfolio;
    watchlist?: string[];
    preferences?: UserPreferences;
  };
  timestamp: string;
}

// Portfolio types
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

// Stock data
export interface StockData {
  symbol: string;
  name: string;
  closingPrice: string;
  openingPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  previousClose: string;
  change: string;
  changePercent: string;
  tradeDate: string;
  marketSegment: string;
}

// Response types
export interface InvestmentResponse {
  requestId: string;
  userId: string;
  type: InvestmentRequestType;
  success: boolean;
  message: string;
  data?: any;
  sources?: string[];
  processingTime: number;
  timestamp: string;
}

