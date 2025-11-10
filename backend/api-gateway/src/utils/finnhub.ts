/**
 * Finnhub API Integration
 */

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

interface FinnhubNewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  category?: string;
  related?: string;
}

export interface MarketNewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  symbol?: string;
  isPersonalized: boolean;
}

/**
 * Get date range for news (last N days)
 */
function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  };
}

/**
 * Validate news article
 */
function validateArticle(article: any): article is FinnhubNewsArticle {
  return (
    article &&
    typeof article.headline === 'string' &&
    article.headline.length > 0 &&
    typeof article.url === 'string' &&
    article.url.length > 0 &&
    typeof article.datetime === 'number'
  );
}

/**
 * Fetch news from Finnhub
 */
export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
  try {
    if (!FINNHUB_API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    const range = getDateRange(5);
    const cleanSymbols = (symbols || [])
      .map(s => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If symbols provided, fetch company-specific news
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, FinnhubNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (symbol) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(symbol)}&from=${range.from}&to=${range.to}&token=${FINNHUB_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const articles: any = await response.json();
            perSymbolArticles[symbol] = (Array.isArray(articles) ? articles : []).filter(validateArticle);
          } catch (e) {
            console.error(`Error fetching company news for ${symbol}:`, e);
            perSymbolArticles[symbol] = [];
          }
        })
      );

      const collected: MarketNewsArticle[] = [];

      // Round-robin collection
      for (let round = 0; round < maxArticles; round++) {
        for (const symbol of cleanSymbols) {
          const list = perSymbolArticles[symbol] || [];
          if (list.length === 0) continue;

          const article = list.shift();
          if (!article || !validateArticle(article)) continue;

          collected.push({
            ...article,
            symbol,
            isPersonalized: true
          });

          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
    }

    // Fallback to general market news
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
    const response = await fetch(generalUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const general: any = await response.json();
    const generalArray = Array.isArray(general) ? general : [];
    const seen = new Set<string>();
    const unique: FinnhubNewsArticle[] = [];

    for (const art of generalArray) {
      if (!validateArticle(art)) continue;
      
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break;
    }

    return unique
      .slice(0, maxArticles)
      .map(a => ({
        ...a,
        isPersonalized: false
      }));

  } catch (err) {
    console.error('getNews error:', err);
    throw new Error('Failed to fetch news');
  }
}

/**
 * Get formatted date for today
 */
export function getFormattedTodayDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return new Date().toLocaleDateString('en-US', options);
}

