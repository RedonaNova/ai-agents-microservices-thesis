"use server";

export interface MSEStockData {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  tradingDate: string;
}

/**
 * Fetch MSE stocks from database (via API Gateway or direct PostgreSQL)
 * For now, returns mock data until we set up the proper endpoint
 */
export async function getMSEStocks(limit: number = 20): Promise<MSEStockData[]> {
  try {
    // TODO: Fetch from PostgreSQL via API Gateway endpoint
    // For now, return mock data based on MSE symbols
    const mseSymbols = [
      'APU-O-0000', 'MNET-O-0000', 'TDB-O-0000', 'KHAN-O-0000', 
      'MIE-O-0000', 'HBO-O-0000', 'BDS-O-0000', 'SUU-O-0000',
      'GOV-O-0000', 'MBG-O-0000', 'TAND-O-0000', 'TTL-O-0000',
      'HSR-O-0000', 'NEH-O-0000', 'UYN-O-0000', 'XAC-O-0000'
    ];

    const mockStocks: MSEStockData[] = mseSymbols.slice(0, limit).map(symbol => {
      const basePrice = 1000 + Math.random() * 9000;
      const change = (Math.random() - 0.5) * 200;
      const changePercent = (change / basePrice) * 100;

      return {
        symbol,
        name: getCompanyName(symbol),
        sector: getSector(symbol),
        closingPrice: basePrice,
        change,
        changePercent,
        volume: Math.floor(Math.random() * 50000) + 1000,
        tradingDate: new Date().toISOString().split('T')[0],
      };
    });

    return mockStocks;
  } catch (error) {
    console.error('Error fetching MSE stocks:', error);
    return [];
  }
}

function getCompanyName(symbol: string): string {
  const names: Record<string, string> = {
    'APU-O-0000': 'АПУ ХК',
    'MNET-O-0000': 'Мобинет ХК',
    'TDB-O-0000': 'Худалдаа Хөгжлийн Банк',
    'KHAN-O-0000': 'Хаан Банк',
    'MIE-O-0000': 'МИК Холдинг',
    'HBO-O-0000': 'Хөдөө Аж Ахуйн Банк',
    'BDS-O-0000': 'Богд Банк',
    'SUU-O-0000': 'Сүү ХК',
    'GOV-O-0000': 'Говь ХК',
    'MBG-O-0000': 'МБГ Капитал',
    'TAND-O-0000': 'Таван Толгой',
    'TTL-O-0000': 'Төмөр Төмөр',
    'HSR-O-0000': 'Хас Банк',
    'NEH-O-0000': 'НэХ Зооринг',
    'UYN-O-0000': 'Үйлдвэрлэгч',
    'XAC-O-0000': 'Хас Холдинг'
  };
  return names[symbol] || symbol;
}

function getSector(symbol: string): string {
  if (symbol.includes('TDB') || symbol.includes('KHAN') || symbol.includes('HBO') || symbol.includes('BDS') || symbol.includes('HSR')) {
    return 'Санхүү';
  }
  if (symbol.includes('TAND') || symbol.includes('GOV')) {
    return 'Уул уурхай';
  }
  if (symbol.includes('MNET') || symbol.includes('MIE')) {
    return 'Технологи';
  }
  if (symbol.includes('SUU')) {
    return 'Хүнсний';
  }
  return 'Бусад';
}

/**
 * Get top movers (gainers and losers)
 */
export async function getTopMovers() {
  const stocks = await getMSEStocks(50);
  
  const gainers = stocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);
  
  const losers = stocks
    .filter(s => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  return { gainers, losers };
}

