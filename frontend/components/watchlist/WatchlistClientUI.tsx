"use client";

import { useState, useMemo } from "react";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { getAuthToken } from "@/lib/actions/auth.actions";
import { 
  TrendingUp, TrendingDown, Star, Trash2, Loader2, 
  Sparkles, Globe, Building2, ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

interface WatchlistStock {
  symbol: string;
  company: string;
  addedAt: string;
  isMse?: boolean;
  price?: number;
  change?: number;
  changePercent?: number;
}

type SortField = "symbol" | "price" | "changePercent" | "addedAt";
type FilterType = "all" | "mse" | "global";

interface WatchlistClientUIProps {
  initialItems: WatchlistStock[];
}

export function WatchlistClientUI({ initialItems }: WatchlistClientUIProps) {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>(initialItems);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("addedAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  
  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  async function handleRemove(symbol: string) {
    if (removing.has(symbol)) return;
    setRemoving(prev => new Set(prev).add(symbol));
    
    try {
      const result = await removeFromWatchlist(symbol);
      if (result.success) {
        setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
        toast.success("Хувьцааг хяналтаас хаслаа");
      } else {
        toast.error(result.error || "Алдаа гарлаа");
      }
    } catch {
      toast.error("Хасахад алдаа гарлаа");
    } finally {
      setRemoving(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }

  async function handleAnalyze() {
    const mseSymbols = watchlist.filter(w => w.isMse).map(w => w.symbol);
    if (mseSymbols.length === 0) {
      toast.error("Хяналтанд МХБ хувьцаа байхгүй байна");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const token = await getAuthToken();
      
      const res = await fetch("/api/watchlist/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      
      if (!data.requestId) {
        setAnalysis(data.error || "Шинжилгээ эхлүүлэхэд алдаа гарлаа");
        setAnalyzing(false);
        return;
      }

      // Poll for response
      let attempts = 0;
      let foundResponse = false;
      while (attempts < 12 && !foundResponse) {
        await new Promise(r => setTimeout(r, 1500));
        const respRes = await fetch(`${API_GATEWAY_URL}/api/agent/response/${data.requestId}`);
        const respData = await respRes.json();
        
        if (respData.found && respData.response) {
          setAnalysis(respData.response);
          foundResponse = true;
          break;
        }
        attempts++;
      }
      
      if (!foundResponse) {
        setAnalysis("Хариулт бэлтгэж байна, түр хүлээгээд дахин оролдоно уу.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis("AI шинжилгээ хийхэд алдаа гарлаа");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  }

  // Filter and sort
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter(item => {
      if (filter === "mse") return item.isMse;
      if (filter === "global") return !item.isMse;
      return true;
    });
  }, [watchlist, filter]);

  const sortedWatchlist = useMemo(() => {
    return [...filteredWatchlist].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "price":
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case "changePercent":
          comparison = (a.changePercent || 0) - (b.changePercent || 0);
          break;
        case "addedAt":
          comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
          break;
      }
      return sortDesc ? -comparison : comparison;
    });
  }, [filteredWatchlist, sortField, sortDesc]);

  const mseCount = watchlist.filter(w => w.isMse).length;
  const globalCount = watchlist.filter(w => !w.isMse).length;

  if (watchlist.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
        <Star className="w-16 h-16 mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          Хяналтын жагсаалт хоосон байна
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Хувьцаа хайж (Ctrl + K) одны тэмдэг дээр дарж хяналтанд нэмнэ үү.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          Хувьцаа хайх
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-800 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === "all" ? "bg-purple-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200"
              }`}
            >
              Бүгд ({watchlist.length})
            </button>
            <button
              onClick={() => setFilter("mse")}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === "mse" ? "bg-purple-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              МХБ ({mseCount})
            </button>
            <button
              onClick={() => setFilter("global")}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === "global" ? "bg-purple-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Дэлхий ({globalCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mseCount > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Шинжилж байна...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Шинжилгээ
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis Result */}
      {analysis && (
        <div className="rounded-xl border border-purple-800/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-100">AI Зөвлөмж</h3>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
              {analysis}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <table className="w-full bg-gray-800 border border-gray-600 rounded-md">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                <button onClick={() => handleSort("symbol")} className="flex items-center gap-1 hover:text-gray-200">
                  Хувьцаа <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">
                Төрөл
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                <button onClick={() => handleSort("price")} className="flex items-center justify-end gap-1 hover:text-gray-200 w-full">
                  Үнэ <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                <button onClick={() => handleSort("changePercent")} className="flex items-center justify-end gap-1 hover:text-gray-200 w-full">
                  Өөрчлөлт <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase w-16">
                Үйлдэл
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedWatchlist.map((item) => {
              const isPositive = (item.changePercent || 0) >= 0;
              const isRemoving = removing.has(item.symbol);

              return (
                <tr key={item.symbol} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-4">
                    <Link href={`/stocks/${item.symbol}`} className="block">
                      <div className="font-semibold text-gray-100 hover:text-purple-400 transition-colors">
                        {item.symbol}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
                        {item.company}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {item.isMse ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-700/50">
                        <Building2 className="w-3 h-3" />
                        МХБ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
                        <Globe className="w-3 h-3" />
                        Дэлхий
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.price ? (
                      <span className="font-medium text-gray-100">
                        ₮{item.price.toLocaleString('mn-MN')}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.changePercent !== undefined ? (
                      <div className={`flex items-center justify-end gap-1 font-medium ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{isPositive ? "+" : ""}{item.changePercent.toFixed(2)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      disabled={isRemoving}
                      className="p-2 rounded-lg hover:bg-red-900/30 text-gray-500 hover:text-red-400 transition-all disabled:opacity-50"
                      title="Хасах"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
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


