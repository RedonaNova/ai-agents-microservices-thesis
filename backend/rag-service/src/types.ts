export interface CompanyDocument {
  symbol: string;
  name: string;
  sector?: string;
  description?: string;
  closingPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  tradingDate?: string;
}

export interface RAGQuery {
  requestId: string;
  userId: string;
  query: string;
  language: 'mongolian' | 'english';
  topK?: number;
  metadata?: Record<string, any>;
}

export interface RAGResponse {
  requestId: string;
  answer: string;
  sources: CompanyDocument[];
  confidence: number;
  language: 'mongolian' | 'english';
}

export interface KafkaMessage {
  requestId: string;
  userId: string;
  type: string;
  query?: string;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

