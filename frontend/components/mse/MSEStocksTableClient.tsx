"use client";

import { useState, useMemo } from "react";
import { MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { toggleWatchlist } from "@/lib/actions/watchlist.actions";
import { TrendingUp, TrendingDown, Star, Loader2, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type SortField = "symbol" | "name" | "sector" | "closingPrice" | "changePercent" | "volume";
type SortDirection = "asc" | "desc";

interface MSEStocksTableClientProps {
  initialStocks: MSEStockData[];
}

export function MSEStocksTableClient({ initialStocks }: MSEStocksTableClientProps) {
  const [stocks] = useState<MSEStockData[]>(initialStocks);
  const [watchlistStatus, setWatchlistStatus] = useState<Map<string, boolean>>(new Map());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("changePercent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
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
  }, [stocks, sortField, sortDirection]);

  return (
    <div className=" overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 ">
        <div>
          <h3 className="font-semibold text-2xl text-gray-100 mb-5">
            МХБ Зах зээлийн мэдээ
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {stocks.length} хувьцаа 
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 border border-gray-600 rounded-lg  ">
          <thead className="bg-gray-800/50 rounded-lg">
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
                  Нэр <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("closingPrice")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Үнэ <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("changePercent")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Өөрчлөлт % <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("volume")}
                  className="flex items-center justify-end gap-1 hover:text-gray-200 w-full"
                >
                  Хэмжээ <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                Үйлдэл
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


