"use client";

import { useEffect, useState, useCallback } from "react";
import { getMSEStockBySymbol, getMSEStockHistory, MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { toggleWatchlist, isInWatchlist } from "@/lib/actions/watchlist.actions";
import { getAuthToken } from "@/lib/actions/auth.actions";
import { 
  TrendingUp, TrendingDown, Star, Loader2, Sparkles, 
  ArrowLeft, Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

type TimePeriod = "1M" | "3M" | "1Y" | "ALL";

export function MSEStockDetail({ symbol }: MSEStockDetailProps) {
  const [stock, setStock] = useState<MSEStockData | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [togglingWatchlist, setTogglingWatchlist] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("3M");
  
  // AI Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const getLimitForPeriod = (period: TimePeriod) => {
    switch (period) {
      case "1M": return 22;
      case "3M": return 66;
      case "1Y": return 252;
      case "ALL": return 500;
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [stockData, historyData, watchlistStatus] = await Promise.all([
        getMSEStockBySymbol(symbol),
        getMSEStockHistory(symbol, getLimitForPeriod(timePeriod)),
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
  }, [symbol, timePeriod]);

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
      // Get auth token for userId
      const token = await getAuthToken();
      
      // Send query to agent with auth
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

      // Poll for response
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
  const chartHistory = history.slice().reverse();
  const maxPrice = chartHistory.length > 0 ? Math.max(...chartHistory.map(h => h.high)) : stock.closingPrice;
  const minPrice = chartHistory.length > 0 ? Math.min(...chartHistory.map(h => h.low)) : stock.closingPrice;
  const priceRange = maxPrice - minPrice || 1;
  const chartHeight = 300;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" />
            Буцах
          </Link>
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded bg-purple-900/50 border border-purple-700">
              <span className="text-xs font-bold text-purple-300">MSE</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-100">{symbol}</h1>
          </div>
          <p className="text-lg text-gray-400 mt-1">{stock.name}</p>
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

      {/* Price Card */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="text-sm text-gray-500 mb-2">Одоогийн үнэ</div>
          <div className="text-4xl font-bold text-gray-100 mb-2">
            ₮{stock.closingPrice.toLocaleString('mn-MN')}
          </div>
          <div className={`flex items-center gap-2 text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>{isPositive ? '+' : ''}{stock.change.toLocaleString('mn-MN')}</span>
            <span className="text-sm">({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Арилжааны хэмжээ</div>
              <div className="text-xl font-semibold text-gray-100">
                {stock.volume.toLocaleString('mn-MN')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Сүүлийн арилжаа</div>
              <div className="text-xl font-semibold text-gray-100">
                {stock.tradingDate ? new Date(stock.tradingDate).toLocaleDateString('mn-MN') : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Үнийн түүх</h2>
          {/* Time Period Selector */}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {(["1M", "3M", "1Y", "ALL"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timePeriod === period
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {period === "ALL" ? "Бүгд" : period}
              </button>
            ))}
          </div>
        </div>
        
        {chartHistory.length > 0 ? (
          <div className="relative" style={{ height: chartHeight + 40 }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full w-20 flex flex-col justify-between text-xs text-gray-500 pr-2">
              <span className="text-right">₮{maxPrice.toLocaleString('mn-MN')}</span>
              <span className="text-right">₮{((maxPrice + minPrice) / 2).toLocaleString('mn-MN')}</span>
              <span className="text-right">₮{minPrice.toLocaleString('mn-MN')}</span>
            </div>
            
            {/* Chart Area */}
            <div className="ml-20 h-full">
              <svg width="100%" height={chartHeight} className="overflow-visible">
                {chartHistory.map((candle, i) => {
                  const candleWidth = Math.max(2, (100 / chartHistory.length) * 0.8);
                  const gapWidth = (100 / chartHistory.length) * 0.2;
                  const x = (i / chartHistory.length) * 100;
                  
                  const openY = ((maxPrice - candle.open) / priceRange) * chartHeight;
                  const closeY = ((maxPrice - candle.close) / priceRange) * chartHeight;
                  const highY = ((maxPrice - candle.high) / priceRange) * chartHeight;
                  const lowY = ((maxPrice - candle.low) / priceRange) * chartHeight;
                  
                  const isUp = candle.close >= candle.open;
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
                  
                  return (
                    <g key={i} className="group">
                      {/* Wick (high-low line) */}
                      <line
                        x1={`${x + candleWidth / 2}%`}
                        y1={highY}
                        x2={`${x + candleWidth / 2}%`}
                        y2={lowY}
                        stroke={isUp ? "#22c55e" : "#ef4444"}
                        strokeWidth={1}
                      />
                      {/* Body (open-close) */}
                      <rect
                        x={`${x}%`}
                        y={bodyTop}
                        width={`${candleWidth}%`}
                        height={bodyHeight}
                        fill={isUp ? "#22c55e" : "#ef4444"}
                        className="opacity-90 hover:opacity-100 transition-opacity"
                      />
                      {/* Tooltip trigger area */}
                      <rect
                        x={`${x}%`}
                        y={0}
                        width={`${candleWidth + gapWidth}%`}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-crosshair"
                      >
                        <title>
{`${new Date(candle.date).toLocaleDateString('mn-MN')}
Нээлт: ₮${candle.open.toLocaleString('mn-MN')}
Дээд: ₮${candle.high.toLocaleString('mn-MN')}
Доод: ₮${candle.low.toLocaleString('mn-MN')}
Хаалт: ₮${candle.close.toLocaleString('mn-MN')}
Хэмжээ: ${candle.volume.toLocaleString('mn-MN')}`}
                        </title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
              
              {/* X-axis dates */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                {chartHistory.length > 0 && (
                  <>
                    <span>{new Date(chartHistory[0].date).toLocaleDateString('mn-MN')}</span>
                    {chartHistory.length > 10 && (
                      <span>{new Date(chartHistory[Math.floor(chartHistory.length / 2)].date).toLocaleDateString('mn-MN')}</span>
                    )}
                    <span>{new Date(chartHistory[chartHistory.length - 1].date).toLocaleDateString('mn-MN')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Түүхийн мэдээлэл алга байна
          </div>
        )}
      </div>

      {/* AI Analysis Section */}
      <div className="rounded-xl border border-purple-800/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">AI Шинжилгээ</h2>
              <p className="text-sm text-gray-400">
                Gemini AI-р {symbol} хувьцааг шинжлэх
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
          <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
              {analysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
