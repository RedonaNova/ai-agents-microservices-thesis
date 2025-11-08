export interface UserRequest {
  requestId: string;
  userId: string;
  intent: string;
  message: string;
  metadata?: {
    symbol?: string;
    period?: number;
    indicators?: string[];
  };
  timestamp: string;
}

export interface AgentResponse {
  requestId: string;
  userId: string;
  agent: string;
  status: 'success' | 'error';
  data?: HistoricalAnalysisReport;
  message?: string;
  timestamp: string;
}

export interface HistoricalAnalysisReport {
  symbol: string;
  summary: string;
  technicalIndicators: TechnicalIndicators;
  priceHistory: PricePoint[];
  patterns: ChartPattern[];
  recommendation: string;
  insights: string[];
}

export interface TechnicalIndicators {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi?: number;
  macd?: MACDData;
  bollingerBands?: BollingerBands;
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartPattern {
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
}

export interface HistoricalData {
  symbol: string;
  trade_date: Date;
  opening_price: number;
  closing_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  previous_close: number;
}

