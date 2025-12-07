"use client";

import { useEffect, useState } from "react";
import { getMSEStocks, MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { toggleWatchlist, isInWatchlist } from "@/lib/actions/watchlist.actions";
import { TrendingUp, TrendingDown, Star, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function MSEStocksWidget() {
  const [stocks, setStocks] = useState<MSEStockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<Map<string, boolean>>(new Map());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStocks();
  }, []);

  useEffect(() => {
    checkWatchlistStatus();
  }, [stocks]);

  async function loadStocks() {
    try {
      const data = await getMSEStocks(16);
      setStocks(data);
    } catch (error) {
      console.error("Error loading MSE stocks:", error);
      toast.error("MSE өгөгдөл ачааллахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function checkWatchlistStatus() {
    const statusMap = new Map<string, boolean>();
    for (const stock of stocks) {
      const inWatchlist = await isInWatchlist(stock.symbol);
      statusMap.set(stock.symbol, inWatchlist);
    }
    setWatchlistStatus(statusMap);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadStocks();
    setRefreshing(false);
    toast.success("Шинэчилсэн");
  }

  async function handleToggleWatchlist(
    e: React.MouseEvent,
    symbol: string,
    name: string
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (togglingWatchlist.has(symbol)) return;

    setTogglingWatchlist(prev => new Set(prev).add(symbol));

    try {
      const result = await toggleWatchlist(symbol, name, true);
      
      if (result.success) {
        setWatchlistStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(symbol, result.inWatchlist);
          return newMap;
        });
        
        toast.success(result.message || (result.inWatchlist ? 'Нэмсэн' : 'Хассан'));
      } else {
        toast.error(result.error || 'Алдаа гарлаа');
      }
    } catch (error) {
      console.error('Watchlist toggle error:', error);
      toast.error('Алдаа гарлаа');
    } finally {
      setTogglingWatchlist(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-purple-900/30 border border-purple-800/30">
            <span className="text-xs font-semibold text-purple-300">MSE</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-100">
            Монголын Хөрөнгийн Бирж
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Шинэчлэх"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-800">
        {stocks.map((stock) => {
          const isPositive = stock.changePercent >= 0;
          const isInWatchlistNow = watchlistStatus.get(stock.symbol);
          const isToggling = togglingWatchlist.has(stock.symbol);

          return (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
              className="group relative bg-gray-900/50 p-4 hover:bg-gray-800/70 transition-all"
            >
              {/* Watchlist Star */}
              <button
                onClick={(e) => handleToggleWatchlist(e, stock.symbol, stock.name)}
                disabled={isToggling}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-all disabled:opacity-50 z-10"
                title={isInWatchlistNow ? "Хяналтаас хасах" : "Хяналтанд нэмэх"}
              >
                {isToggling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                ) : (
                  <Star
                    className={`w-3.5 h-3.5 transition-all ${
                      isInWatchlistNow
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-500 hover:text-yellow-400'
                    }`}
                  />
                )}
              </button>

              {/* Symbol & Name */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{stock.symbol}</span>
                </div>
                <h4 className="font-semibold text-sm text-gray-100 truncate">
                  {stock.name}
                </h4>
                {stock.sector && (
                  <span className="text-xs text-gray-500">{stock.sector}</span>
                )}
              </div>

              {/* Price */}
              <div className="mb-2">
                <div className="text-lg font-bold text-gray-100">
                  ₮{stock.closingPrice.toLocaleString('mn-MN', { maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Change */}
              <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{stock.change.toFixed(2)}
                </span>
                <span className="text-xs">
                  ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                </span>
              </div>

              {/* Volume */}
              <div className="mt-2 text-xs text-gray-500">
                Эргэлт: {stock.volume.toLocaleString('mn-MN')}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800 text-center">
        <Link
          href="/watchlist"
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Хяналтын жагсаалт үзэх →
        </Link>
      </div>
    </div>
  );
}

