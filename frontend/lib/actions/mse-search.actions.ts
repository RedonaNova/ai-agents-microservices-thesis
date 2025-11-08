"use server";

import { v4 as uuidv4 } from 'uuid';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001';

export interface MSEStock {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  tradingDate?: string;
  description?: string; // Mongolian description from RAG
}

/**
 * Search MSE stocks with Mongolian descriptions via RAG
 */
export async function searchMSEStocks(query: string): Promise<MSEStock[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const requestId = uuidv4();
    
    // Query RAG service for Mongolian context
    const response = await fetch(`${API_GATEWAY_URL}/api/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        userId: 'search-user',
        query: query.trim(),
        language: 'mongolian',
        topK: 10,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('RAG query failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.success && data.data && Array.isArray(data.data.sources)) {
      return data.data.sources.map((source: any) => ({
        symbol: source.symbol,
        name: source.name,
        sector: source.sector,
        closingPrice: source.closingPrice,
        change: source.change,
        changePercent: source.changePercent,
        volume: source.volume,
        tradingDate: source.tradingDate,
        description: data.data.answer, // Mongolian description
      }));
    }

    return [];
  } catch (error) {
    console.error('MSE search error:', error);
    return [];
  }
}

/**
 * Get all MSE stocks (for initial display)
 */
export async function getAllMSEStocks(): Promise<MSEStock[]> {
  try {
    // This could be cached or fetched from a dedicated endpoint
    // For now, return empty and let users search
    return [];
  } catch (error) {
    console.error('Get all MSE stocks error:', error);
    return [];
  }
}

