"use client";

import { useEffect, useState } from "react";
import { getTopMovers, MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export function MSEHistoryChart() {
  const [gainers, setGainers] = useState<MSEStockData[]>([]);
  const [losers, setLosers] = useState<MSEStockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopMovers();
  }, []);

  async function loadTopMovers() {
    try {
      const { gainers: topGainers, losers: topLosers } = await getTopMovers();
      setGainers(topGainers);
      setLosers(topLosers);
    } catch (error) {
      console.error("Error loading top movers:", error);
    } finally {
      setLoading(false);
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
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Gainers */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-100">Top Gainers</h3>
        </div>
        <div className="space-y-3">
          {gainers.map((stock, index) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-400">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-100">{stock.name}</div>
                  <div className="text-xs text-gray-500">{stock.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-100">
                  ₮{stock.closingPrice.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-green-400">
                  +{stock.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {gainers.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No gainers today
            </div>
          )}
        </div>
      </div>

      {/* Top Losers */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-100">Top Losers</h3>
        </div>
        <div className="space-y-3">
          {losers.map((stock, index) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-400">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-100">{stock.name}</div>
                  <div className="text-xs text-gray-500">{stock.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-100">
                  ₮{stock.closingPrice.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-red-400">
                  {stock.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {losers.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No losers today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

