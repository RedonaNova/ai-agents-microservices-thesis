"use client";

import { useEffect, useState } from "react";
import { getWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { WatchlistItem } from "./WatchlistItem";
import { WatchlistAIAdvisor } from "./WatchlistAIAdvisor";
import { AlertCircle, ListX } from "lucide-react";
import { toast } from "sonner";

interface WatchlistStock {
  symbol: string;
  company: string;
  addedAt: string;
}

export function WatchlistContent() {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWatchlist();
  }, []);

  async function loadWatchlist() {
    try {
      const data = await getWatchlist();
      setWatchlist(data);
    } catch (error) {
      console.error("Error loading watchlist:", error);
      toast.error("Хяналтын жагсаалтыг ачааллахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(symbol: string) {
    try {
      const result = await removeFromWatchlist(symbol);
      if (result.success) {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        toast.success("Хувьцааг хяналтын жагсаалтаас хаслаа");
      } else {
        toast.error(result.error || "Алдаа гарлаа");
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      toast.error("Хасахад алдаа гарлаа");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-gray-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="text-center py-20">
        <ListX className="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          Хяналтын жагсаалт хоосон байна
        </h3>
        <p className="text-gray-400 mb-6">
          Ctrl + K дарж хувьцаа хайгаад од дарж нэмнэ үү
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Advisor */}
      <WatchlistAIAdvisor symbols={watchlist.map((w) => w.symbol)} />

      {/* Watchlist Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Таны хувьцаанууд ({watchlist.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {watchlist.map((item) => (
            <WatchlistItem
              key={item.symbol}
              symbol={item.symbol}
              company={item.company}
              addedAt={item.addedAt}
              onRemove={() => handleRemove(item.symbol)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

