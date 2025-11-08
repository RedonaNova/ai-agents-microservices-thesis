export interface UserRequest {
  requestId: string;
  userId: string;
  intent: string;
  message: string;
  metadata?: any;
  timestamp: string;
}

export interface AgentResponse {
  requestId: string;
  userId: string;
  agent: string;
  status: 'success' | 'error';
  data?: MarketAnalysisReport;
  message?: string;
  timestamp: string;
}

export interface MarketAnalysisReport {
  summary: string;
  marketOverview: {
    totalCompanies: number;
    gainers: number;
    losers: number;
    averageChange: number;
  };
  topPerformers: StockPerformance[];
  bottomPerformers: StockPerformance[];
  sectorAnalysis?: SectorData[];
  insights: string[];
}

export interface StockPerformance {
  symbol: string;
  companyName: string;
  closingPrice: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface SectorData {
  sector: string;
  companies: number;
  averageChange: number;
  totalVolume: number;
}

