"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface WatchlistItemProps {
  symbol: string;
  company: string;
  addedAt: string;
  onRemove: () => void;
}

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
}

export function WatchlistItem({ symbol, company, addedAt, onRemove }: WatchlistItemProps) {
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    // TODO: Fetch real-time price from MSE or API
    // For now, using mock data
    setTimeout(() => {
      setPrice({
        price: Math.random() * 10000 + 1000,
        change: (Math.random() - 0.5) * 200,
        changePercent: (Math.random() - 0.5) * 10,
      });
      setLoading(false);
    }, 500);
  }, [symbol]);

  async function handleRemove() {
    setRemoving(true);
    await onRemove();
  }

  const isPositive = price && price.change >= 0;

  return (
    <div className="relative group rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-all">
      {/* Remove button */}
      <button
        onClick={handleRemove}
        disabled={removing}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 hover:text-red-400 transition-all disabled:opacity-50"
        title="Устгах"
      >
        {removing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>

      <Link href={`/stocks/${symbol}`} className="block">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-gray-100">{symbol}</h3>
          <p className="text-sm text-gray-400 truncate">{company}</p>
        </div>

        {/* Price Info */}
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3" />
          </div>
        ) : price ? (
          <div>
            <div className="text-2xl font-bold text-gray-100 mb-1">
              ₮{price.price.toLocaleString('mn-MN', { maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isPositive ? '+' : ''}{price.change.toFixed(2)} ({isPositive ? '+' : ''}{price.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Үнийн мэдээлэл байхгүй</div>
        )}

        {/* Added date */}
        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
          Нэмсэн: {new Date(addedAt).toLocaleDateString('mn-MN')}
        </div>
      </Link>
    </div>
  );
}

