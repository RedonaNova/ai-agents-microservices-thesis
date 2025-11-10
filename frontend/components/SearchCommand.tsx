"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { searchMSEStocks } from "@/lib/actions/mse-search.actions";
import { toggleWatchlist, isInWatchlist } from "@/lib/actions/watchlist.actions";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

interface MSEStock {
  symbol: string;
  name: string;
  sector?: string;
  closingPrice?: number;
  changePercent?: number;
}

export default function SearchCommand({
  renderAs = "button",
  label = "Add stock",
  initialStocks,
}: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
  const [mseStocks, setMseStocks] = useState<MSEStock[]>([]);
  const [loadingMSE, setLoadingMSE] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<Map<string, boolean>>(new Map());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<string>>(new Set());

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Check watchlist status for visible stocks
  useEffect(() => {
    async function checkWatchlistStatus() {
      const allSymbols = [
        ...displayStocks.map(s => s.symbol),
        ...mseStocks.map(s => s.symbol)
      ];
      
      const statusMap = new Map<string, boolean>();
      for (const symbol of allSymbols) {
        const inWatchlist = await isInWatchlist(symbol);
        statusMap.set(symbol, inWatchlist);
      }
      setWatchlistStatus(statusMap);
    }

    if (displayStocks.length > 0 || mseStocks.length > 0) {
      checkWatchlistStatus();
    }
  }, [displayStocks.length, mseStocks.length]);

  const handleSearch = async () => {
    if (!isSearchMode) {
      setStocks(initialStocks);
      setMseStocks([]);
      return;
    }

    // Search global stocks (Finnhub)
    setLoading(true);
    try {
      const results = await searchStocks(searchTerm.trim());
      setStocks(results);
    } catch {
      setStocks([]);
    } finally {
      setLoading(false);
    }

    // Search MSE stocks (RAG)
    setLoadingMSE(true);
    try {
      const mseResults = await searchMSEStocks(searchTerm.trim());
      setMseStocks(mseResults);
    } catch {
      setMseStocks([]);
    } finally {
      setLoadingMSE(false);
    }
  };

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
    setMseStocks([]);
  };

  const handleToggleWatchlist = async (
    e: React.MouseEvent,
    symbol: string,
    name: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple clicks
    if (togglingWatchlist.has(symbol)) return;

    setTogglingWatchlist(prev => new Set(prev).add(symbol));

    try {
      const result = await toggleWatchlist(symbol, name);
      
      if (result.success) {
        // Update local status
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
  };

  return (
    <>
      {renderAs === "text" ? (
        <span onClick={() => setOpen(true)} className="search-text cursor-pointer">
          {label}
        </span>
      ) : (
        <Button onClick={() => setOpen(true)} className="search-btn">
          {label}
        </Button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="search-dialog"
      >
        <div className="search-field">
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Хувьцаа хайх..."
            className="search-input"
          />
          {(loading || loadingMSE) && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list max-h-[500px] overflow-y-auto">
          {/* Global Stocks Section */}
          {loading ? (
            <CommandEmpty className="search-list-empty">
              Хувьцаа хайж байна...
            </CommandEmpty>
          ) : displayStocks?.length === 0 && !isSearchMode ? (
            <div className="search-list-indicator">
              Хувьцаанууд олдсонгүй
            </div>
          ) : displayStocks?.length > 0 ? (
            <div className="pb-2">
              <div className="search-count px-2 py-2 text-xs font-semibold text-gray-400 uppercase">
                {isSearchMode ? "Дэлхийн хувьцаа" : "Тренд хувьцаанууд"}
                {` `}({displayStocks?.length || 0})
              </div>
              <ul>
                {displayStocks?.map((stock) => (
                  <li key={stock.symbol} className="search-item">
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      onClick={handleSelectStock}
                      className="search-item-link group flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 rounded-md transition-colors"
                    >
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="search-item-name font-medium text-gray-100">
                          {stock.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {stock.symbol} | {stock.exchange} | {stock.type}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleToggleWatchlist(e, stock.symbol, stock.name)}
                        disabled={togglingWatchlist.has(stock.symbol)}
                        className="p-1.5 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title={watchlistStatus.get(stock.symbol) ? "Хяналтаас хасах" : "Хяналтанд нэмэх"}
                      >
                        {togglingWatchlist.has(stock.symbol) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <Star
                            className={`w-4 h-4 transition-all ${
                              watchlistStatus.get(stock.symbol)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-500 hover:text-yellow-400'
                            }`}
                          />
                        )}
                      </button>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* MSE Stocks Section */}
          {isSearchMode && (
            <>
              <div className="border-t border-gray-800 my-2" />
              {loadingMSE ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  MSE хувьцаа хайж байна...
                </div>
              ) : mseStocks.length > 0 ? (
                <div>
                  <div className="search-count px-2 py-2 text-xs font-semibold text-gray-400 uppercase">
                    MSE Stocks ({mseStocks.length})
                  </div>
                  <ul>
                    {mseStocks.map((stock) => (
                      <li key={stock.symbol} className="search-item">
                        <Link
                          href={`/stocks/${stock.symbol}`}
                          onClick={handleSelectStock}
                          className="search-item-link group flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 rounded-md transition-colors"
                        >
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="search-item-name font-medium text-gray-100 flex items-center gap-2">
                              {stock.name}
                              <span className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded font-semibold">MSE</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {stock.symbol} {stock.sector && `| ${stock.sector}`}
                            </div>
                            {stock.closingPrice !== undefined && (
                              <div className="text-xs text-gray-400 mt-1">
                                ₮{stock.closingPrice.toLocaleString('mn-MN')}
                                {stock.changePercent !== undefined && (
                                  <span
                                    className={`ml-2 ${
                                      stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}
                                  >
                                    {stock.changePercent >= 0 ? '+' : ''}
                                    {stock.changePercent.toFixed(2)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => handleToggleWatchlist(e, stock.symbol, stock.name)}
                            disabled={togglingWatchlist.has(stock.symbol)}
                            className="p-1.5 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title={watchlistStatus.get(stock.symbol) ? "Хяналтаас хасах" : "Хяналтанд нэмэх"}
                          >
                            {togglingWatchlist.has(stock.symbol) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : (
                              <Star
                                className={`w-4 h-4 transition-all ${
                                  watchlistStatus.get(stock.symbol)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-500 hover:text-yellow-400'
                                }`}
                              />
                            )}
                          </button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  MSE-д хайлтын үр дүн олдсонгүй
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !loadingMSE && displayStocks?.length === 0 && mseStocks.length === 0 && isSearchMode && (
            <div className="px-3 py-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Хайлтын үр дүн олдсонгүй</p>
              <p className="text-xs text-gray-500 mt-1">
                Өөр түлхүүр үгээр хайж үзнэ үү
              </p>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
