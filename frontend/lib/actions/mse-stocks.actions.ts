"use server";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

export interface MSEStockData {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  tradingDate?: string;
}

export interface MSEStockDataFull extends MSEStockData {
  displaySymbol: string;
  openingPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  turnover: number;
}

/**
 * Fetch MSE stocks via API Gateway (no direct DB connection from frontend)
 */
export async function getMSEStocks(limit: number = 200): Promise<MSEStockData[]> {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/trading-status`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();

    const stocks = (data.tradingStatus || [])
      .map((row: any) => ({
        symbol: row.symbol,
        name: row.name || row.symbol,
        sector: row.sector || '',
        closingPrice: parseFloat(row.current_price) || 0,
        change: (parseFloat(row.current_price) || 0) - (parseFloat(row.previous_close) || 0),
        changePercent: parseFloat(row.change_percent) || 0,
        volume: parseInt(row.volume) || 0,
        tradingDate: row.last_trade_time,
      }))
      .slice(0, limit);

    return stocks;
  } catch (error) {
    console.error('Error fetching MSE stocks:', error);
    return [];
  }
}

/**
 * Get top movers (gainers and losers) via API Gateway
 */
export async function getTopMovers() {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/summary`, {
      cache: 'no-store',
    });
    if (!res.ok) return { gainers: [], losers: [] };
    const data = await res.json();

    const mapStock = (row: any): MSEStockData => ({
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: '',
      closingPrice: parseFloat(row.current_price) || 0,
      change: (parseFloat(row.current_price) || 0) - (parseFloat(row.previous_close) || 0),
      changePercent: parseFloat(row.change_percent) || 0,
      volume: parseInt(row.volume) || 0,
    });

    return {
      gainers: (data.summary?.topGainers || []).map(mapStock),
      losers: (data.summary?.topLosers || []).map(mapStock),
    };
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return { gainers: [], losers: [] };
  }
}

/**
 * Get single stock data by symbol (basic)
 */
export async function getMSEStockBySymbol(symbol: string): Promise<MSEStockData | null> {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/trading-status/${symbol}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = data.tradingStatus;
    if (!row) return null;

    return {
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: '',
      closingPrice: parseFloat(row.current_price) || 0,
      change: (parseFloat(row.current_price) || 0) - (parseFloat(row.previous_close) || 0),
      changePercent: parseFloat(row.change_percent) || 0,
      volume: parseInt(row.volume) || 0,
      tradingDate: row.last_trade_time,
    };
  } catch (error) {
    console.error('Error fetching MSE stock:', error);
    return null;
  }
}

/**
 * Get single stock data by symbol (full details)
 */
export async function getMSEStockBySymbolFull(symbol: string): Promise<MSEStockDataFull | null> {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/trading-status/${symbol}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = data.tradingStatus;
    if (!row) return null;

    const currentPrice = parseFloat(row.current_price) || 0;
    const previousClose = parseFloat(row.previous_close) || 0;
    
    // Create display symbol without -O-0000 suffix
    const displaySymbol = row.symbol.replace('-O-0000', '');

    return {
      symbol: row.symbol,
      displaySymbol,
      name: row.name || displaySymbol,
      sector: '',
      closingPrice: currentPrice,
      openingPrice: parseFloat(row.opening_price) || currentPrice,
      highPrice: parseFloat(row.high_price) || currentPrice,
      lowPrice: parseFloat(row.low_price) || currentPrice,
      previousClose: previousClose,
      change: currentPrice - previousClose,
      changePercent: parseFloat(row.change_percent) || 0,
      volume: parseInt(row.volume) || 0,
      turnover: parseFloat(row.turnover) || 0,
      tradingDate: row.last_trade_time,
    };
  } catch (error) {
    console.error('Error fetching MSE stock:', error);
    return null;
  }
}

/**
 * Get stock trading history for charts
 */
export async function getMSEStockHistory(symbol: string, limit: number = 30) {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/mse/history/${symbol}?limit=${limit}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.history || []).map((row: any) => ({
      date: row.trade_date,
      open: parseFloat(row.opening_price) || 0,
      high: parseFloat(row.high_price) || 0,
      low: parseFloat(row.low_price) || 0,
      close: parseFloat(row.closing_price) || 0,
      volume: parseInt(row.volume) || 0,
    }));
  } catch (error) {
    console.error('Error fetching MSE history:', error);
    return [];
  }
}
