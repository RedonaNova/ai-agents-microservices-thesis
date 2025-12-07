"use client";

import { useEffect, useState, useCallback } from "react";
import { getMSEStocks, MSEStockData } from "@/lib/actions/mse-stocks.actions";
import { Loader2 } from "lucide-react";

export function MSEHeatmap() {
  const [loading, setLoading] = useState(true);
  const [sectorData, setSectorData] = useState<Map<string, { count: number; avgChange: number }>>(new Map());

  const loadStocks = useCallback(async () => {
    try {
      const data = await getMSEStocks(200);
      
      // Calculate sector aggregations
      const sectors = new Map<string, { count: number; totalChange: number }>();
      data.forEach(stock => {
        const sector = stock.sector || "Бусад";
        const existing = sectors.get(sector) || { count: 0, totalChange: 0 };
        sectors.set(sector, {
          count: existing.count + 1,
          totalChange: existing.totalChange + stock.changePercent
        });
      });
      
      // Calculate averages
      const result = new Map<string, { count: number; avgChange: number }>();
      sectors.forEach((value, key) => {
        result.set(key, {
          count: value.count,
          avgChange: value.totalChange / value.count
        });
      });
      
      setSectorData(result);
    } catch (error) {
      console.error("Error loading MSE stocks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  function getColorForChange(change: number): string {
    if (change > 3) return "bg-green-600";
    if (change > 1) return "bg-green-500";
    if (change > 0) return "bg-green-400";
    if (change > -1) return "bg-red-400";
    if (change > -3) return "bg-red-500";
    return "bg-red-600";
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
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Салбарын хандлага (Heatmap)</h3>
        <p className="text-sm text-gray-400 mt-1">
          Салбар бүрийн дундаж өсөлт/бууралт
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from(sectorData.entries()).map(([sector, data]) => (
          <div
            key={sector}
            className={`${getColorForChange(data.avgChange)} rounded-lg p-4 text-white`}
          >
            <div className="text-sm font-medium mb-1">{sector}</div>
            <div className="text-2xl font-bold">
              {data.avgChange >= 0 ? '+' : ''}{data.avgChange.toFixed(2)}%
            </div>
            <div className="text-xs opacity-80 mt-1">
              {data.count} хувьцаа
            </div>
          </div>
        ))}
      </div>

      {sectorData.size === 0 && (
        <div className="text-center py-10 text-gray-400">
          Салбарын мэдээлэл олдсонгүй
        </div>
      )}
    </div>
  );
}

