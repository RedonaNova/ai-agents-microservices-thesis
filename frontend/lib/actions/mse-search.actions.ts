"use server";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

export interface MSEStock {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  tradingDate?: string;
  description?: string;
}

/**
 * Search MSE stocks by symbol or name
 * Uses API Gateway to avoid direct DB connection issues
 */
export async function searchMSEStocks(query: string): Promise<MSEStock[]> {
  try {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerm = query.trim().toUpperCase();
    
    // Fetch all trading status and filter client-side for more reliable search
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/trading-status`, {
      cache: 'no-store',
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    
    const allStocks = data.tradingStatus || [];
    
    // Filter by symbol prefix OR name contains (case-insensitive)
    const filtered = allStocks.filter((stock: any) => {
      const symbolMatch = stock.symbol?.toUpperCase().startsWith(searchTerm) || 
                          stock.symbol?.toUpperCase().replace('-O-0000', '').startsWith(searchTerm);
      const nameMatch = stock.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return symbolMatch || nameMatch;
    });

    return filtered.slice(0, 10).map((row: any) => ({
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: '',
      closingPrice: parseFloat(row.current_price) || undefined,
      change: row.previous_close ? (parseFloat(row.current_price) - parseFloat(row.previous_close)) : undefined,
      changePercent: parseFloat(row.change_percent) || undefined,
      volume: parseInt(row.volume) || undefined,
      tradingDate: row.last_trade_time,
    }));
  } catch (error) {
    console.error('MSE search error:', error);
    return [];
  }
}

/**
 * Get all MSE stocks (for initial display)
 */
export async function getAllMSEStocks(limit: number = 20): Promise<MSEStock[]> {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/trading-status`, {
      cache: 'no-store',
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.tradingStatus || []).slice(0, limit).map((row: any) => ({
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: '',
      closingPrice: parseFloat(row.current_price) || undefined,
      change: row.previous_close ? (parseFloat(row.current_price) - parseFloat(row.previous_close)) : undefined,
      changePercent: parseFloat(row.change_percent) || undefined,
      volume: parseInt(row.volume) || undefined,
      tradingDate: row.last_trade_time,
    }));
  } catch (error) {
    console.error('Get all MSE stocks error:', error);
    return [];
  }
}
