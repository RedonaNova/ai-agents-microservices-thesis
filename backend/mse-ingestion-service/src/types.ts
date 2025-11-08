/**
 * MSE Trading History Data Structure
 * Based on API response format
 */
export interface MSETradingHistory {
  Symbol: string; // Company's Symbol (e.g., "KHAN-O-0000")
  Name: string; // Company's Name (e.g., "Khan Bank")
  OpeningPrice: number;
  ClosingPrice: number;
  HighPrice: number;
  LowPrice: number;
  Volume: number; // Total numbers sold during date
  PreviousClose: number;
  Turnover: number; // Total Amount of money sold during date
  MDEntryTime: string; // Last trade (ISO timestamp)
  companycode: number;
  MarketSegmentID: string; // "I", "II"
  securityType: string; // "CS" = Common Stock
  dates: string; // The date (YYYY-MM-DD)
}

/**
 * MSE Trading Status (Real-time)
 */
export interface MSETradingStatus {
  Symbol: string;
  Name: string;
  OpeningPrice: number;
  ClosingPrice: number;
  HighPrice: number;
  LowPrice: number;
  Volume: number;
  PreviousClose: number;
  Turnover: number;
  MDEntryTime: string; // ISO timestamp
  companycode: number; // "I", "II"
  MarketSegmentID: string;
  securityType: string;
}

/**
 * MSE Company Information
 */
export interface MSECompany {
  companycode: number;
  Symbol: string;
  Name: string;
  sector?: string;
  MarketSegmentID: string;
  securityType: string;
  listedShares?: number;
  listingDate?: string;
}

/**
 * Kafka Message for Stock Updates
 */
export interface StockUpdateMessage {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  market: 'MSE' | 'US';
  metadata?: {
    high: number;
    low: number;
    open: number;
    previousClose: number;
    changePercent?: number;
  };
}

/**
 * Service Configuration
 */
export interface MSEIngestionConfig {
  apiUrl?: string;
  apiKey?: string;
  pollingIntervalMs: number;
  batchSize: number;
  enableRealtime: boolean;
  enableHistorical: boolean;
}

