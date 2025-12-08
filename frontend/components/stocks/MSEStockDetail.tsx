"use client";

import { useEffect, useState, useCallback } from "react";
import { getMSEStockBySymbolFull, getMSEStockHistory, type MSEStockDataFull } from "@/lib/actions/mse-stocks.actions";
import { toggleWatchlist, isInWatchlist } from "@/lib/actions/watchlist.actions";
import { getAuthToken } from "@/lib/actions/auth.actions";
import { 
  TrendingUp, TrendingDown, Star, Loader2, Sparkles, 
  ArrowLeft, Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { MSEStockChart } from "./MSEStockChart";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

interface MSEStockDetailProps {
  symbol: string;
}

interface HistoryData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function MSEStockDetail({ symbol }: MSEStockDetailProps) {
  const [stock, setStock] = useState<MSEStockDataFull | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [togglingWatchlist, setTogglingWatchlist] = useState(false);
  
  // AI Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [stockData, historyData, watchlistStatus] = await Promise.all([
        getMSEStockBySymbolFull(symbol),
        getMSEStockHistory(symbol, 500), // Get more history for chart
        isInWatchlist(symbol),
      ]);
      setStock(stockData);
      setHistory(historyData);
      setInWatchlist(watchlistStatus);
    } catch (error) {
      console.error("Error loading MSE stock:", error);
      toast.error("Хувьцааны мэдээлэл ачааллахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleWatchlist() {
    if (togglingWatchlist || !stock) return;
    setTogglingWatchlist(true);
    try {
      const result = await toggleWatchlist(symbol, stock.name, true);
      if (result.success) {
        setInWatchlist(result.inWatchlist);
        toast.success(result.message || (result.inWatchlist ? "Нэмсэн" : "Хассан"));
      } else {
        toast.error(result.error || "Алдаа гарлаа");
      }
    } catch {
      toast.error("Алдаа гарлаа");
    } finally {
      setTogglingWatchlist(false);
    }
  }

  async function handleAnalyze() {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const token = await getAuthToken();
      
      const queryRes = await fetch(`${API_GATEWAY_URL}/api/agent/query`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: `${symbol} хувьцааг шинжилж, хөрөнгө оруулалтын зөвлөгөө өгнө үү.`,
          type: "portfolio",
          context: { symbols: [symbol] },
        }),
      });
      const queryData = await queryRes.json();
      
      if (!queryData.requestId) {
        setAnalysis("Шинжилгээ эхлүүлэхэд алдаа гарлаа");
        setAnalyzing(false);
        return;
      }

      let attempts = 0;
      let foundResponse = false;
      while (attempts < 12 && !foundResponse) {
        await new Promise(r => setTimeout(r, 1500));
        const respRes = await fetch(`${API_GATEWAY_URL}/api/agent/response/${queryData.requestId}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Хувьцаа олдсонгүй</h2>
        <p className="text-gray-500 mb-6">{symbol} символтой хувьцаа МХБ-д бүртгэлгүй байна</p>
        <Link href="/" className="text-purple-400 hover:text-purple-300 flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Нүүр хуудас руу буцах
        </Link>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;
  const turnover = stock.turnover || (stock.closingPrice * stock.volume);

  // Stats for the cards grid
  const statsCards = [
    { label: "Хаалтын ханш", value: `₮${stock.closingPrice.toLocaleString('mn-MN')}`, highlight: true },
    { 
      label: "Өөрчлөлт", 
      value: `${isPositive ? '+' : ''}${stock.change.toLocaleString('mn-MN')} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)`,
      color: isPositive ? "text-green-400" : "text-red-400"
    },
    { label: "Нээлтийн ханш", value: `₮${stock.openingPrice.toLocaleString('mn-MN')}` },
    { label: "Дээд", value: `₮${stock.highPrice.toLocaleString('mn-MN')}`, color: "text-green-400" },
    { label: "Ширхэг", value: stock.volume.toLocaleString('mn-MN') },
    { label: "Өмнөх хаалт", value: `₮${stock.previousClose.toLocaleString('mn-MN')}` },
    { label: "Доод", value: `₮${stock.lowPrice.toLocaleString('mn-MN')}`, color: "text-red-400" },
    { label: "Үнийн дүн", value: `₮${turnover.toLocaleString('mn-MN', { maximumFractionDigits: 0 })}` },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Symbol & Watchlist */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400 flex items-center gap-1 mb-3">
            <ArrowLeft className="w-3 h-3" />
            Буцах
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded bg-purple-900/50 border border-purple-700 text-xs font-bold text-purple-300">
              MSE
            </span>
            <h1 className="text-3xl font-bold text-gray-100">{stock.displaySymbol || symbol.replace('-O-0000', '')}</h1>
            <div className={`flex items-center gap-1 text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
            </div>
          </div>
          <p className="text-lg text-gray-400 mt-1">{stock.name}</p>
          {stock.tradingDate && (
            <p className="text-sm text-gray-500 mt-1">
              Сүүлийн арилжаа: {new Date(stock.tradingDate).toLocaleDateString('mn-MN')}
            </p>
          )}
        </div>
        
        <button
          onClick={handleToggleWatchlist}
          disabled={togglingWatchlist}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            inWatchlist 
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' 
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/50'
          }`}
        >
          {togglingWatchlist ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Star className={`w-4 h-4 ${inWatchlist ? 'fill-yellow-400' : ''}`} />
          )}
          {inWatchlist ? 'Хяналтанд байна' : 'Хяналтанд нэмэх'}
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => (
          <div 
            key={idx} 
            className={`rounded-lg bg-gray-800 border border-gray-600 p-4 ${stat.highlight ? 'md:col-span-1' : ''}`}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-lg font-bold ${stat.color || 'text-gray-100'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Price Chart */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Үнийн түүх</h2>
        <MSEStockChart symbol={symbol} historyData={history} />
      </div>

      {/* AI Analysis Section */}
      <div className="rounded-lg bg-gray-800 border border-gray-600 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-100">AI Шинжилгээ</h2>
              <p className="text-sm text-gray-400">
                Gemini AI-р {stock.displaySymbol || symbol.replace('-O-0000', '')} хувьцааг шинжлэх
              </p>
            </div>
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Шинжилж байна...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Шинжилгээ хийх
              </>
            )}
          </button>
        </div>

        {analysis && (
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
            <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
              {analysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
