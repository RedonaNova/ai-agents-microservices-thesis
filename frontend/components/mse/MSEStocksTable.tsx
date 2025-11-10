"use client";

import { useEffect, useState } from "react";
import { getMSEStocks, MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { toggleWatchlist, isInWatchlist } from "@/lib/actions/watchlist.actions";
import { TrendingUp, TrendingDown, Star, Loader2, RefreshCw, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type SortField = "symbol" | "name" | "sector" | "closingPrice" | "changePercent" | "volume";
type SortDirection = "asc" | "desc";

export function MSEStocksTable() {
  const [stocks, setStocks] = useState<MSEStockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<Map<string, boolean>>(new Map());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("changePercent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    loadStocks();
  }, []);

  useEffect(() => {
    checkWatchlistStatus();
  }, [stocks]);

  async function loadStocks() {
    try {
      const data = await getMSEStocks(50);
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
      const result = await toggleWatchlist(symbol, name);
      
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

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  const sortedStocks = [...stocks].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortDirection === "asc" 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

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
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            MSE Stocks Data Table
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {stocks.length} stocks • Click column headers to sort
          </p>
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("symbol")}
                  className="flex items-center gap-1 hover:text-gray-200"
                >
                  Symbol <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 hover:text-gray-200"
                >
                  Name <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("sector")}
                  className="flex items-center gap-1 hover:text-gray-200"
                >
                  Sector <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("closingPrice")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Price <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("changePercent")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Change % <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("volume")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Volume <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedStocks.map((stock) => {
              const isPositive = stock.changePercent >= 0;
              const isInWatchlistNow = watchlistStatus.get(stock.symbol);
              const isToggling = togglingWatchlist.has(stock.symbol);

              return (
                <tr
                  key={stock.symbol}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      className="text-sm font-mono text-purple-400 hover:text-purple-300"
                    >
                      {stock.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      className="text-sm text-gray-100 hover:text-gray-300"
                    >
                      {stock.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-400">{stock.sector}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-100">
                      ₮{stock.closingPrice.toLocaleString('mn-MN', { maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className={`flex items-center justify-end gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-400">
                      {stock.volume.toLocaleString('mn-MN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={(e) => handleToggleWatchlist(e, stock.symbol, stock.name)}
                      disabled={isToggling}
                      className="p-1.5 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                      title={isInWatchlistNow ? "Хяналтаас хасах" : "Хяналтанд нэмэх"}
                    >
                      {isToggling ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Star
                          className={`w-4 h-4 transition-all ${
                            isInWatchlistNow
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-500 hover:text-yellow-400'
                          }`}
                        />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

