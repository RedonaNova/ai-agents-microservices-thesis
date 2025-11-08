"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { getPortfolioAdvice } from "@/lib/actions/agent.actions";

interface WatchlistAIAdvisorProps {
  symbols: string[];
}

export function WatchlistAIAdvisor({ symbols }: WatchlistAIAdvisorProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function getAdvice() {
    setLoading(true);
    setExpanded(true);
    
    try {
      const response = await getPortfolioAdvice({
        userId: 'watchlist-user',
        message: `Миний хяналтын жагсаалтад дараах хувьцаанууд байна: ${symbols.join(', ')}. Энэ портфолиогийн талаар зөвлөгөө өгнө үү.`,
        symbols,
        riskTolerance: 'moderate',
      });

      if (response.data && response.data.advice) {
        setAdvice(response.data.advice);
      } else {
        setAdvice(response.message || 'Зөвлөгөө авахад алдаа гарлаа');
      }
    } catch (error) {
      console.error('Error getting AI advice:', error);
      setAdvice('AI зөвлөгөө авахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  }

  if (symbols.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-purple-800/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">AI Зөвлөх</h3>
            <p className="text-sm text-gray-400">
              Таны хяналтын жагсаалтын талаар ухаалаг зөвлөмж
            </p>
          </div>
        </div>
        
        {!expanded && (
          <button
            onClick={getAdvice}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Боловсруулж байна...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Зөвлөгөө авах
              </>
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : advice ? (
            <div className="prose prose-invert max-w-none">
              <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                  {advice}
                </div>
              </div>

              {/* Quick Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Давуу тал</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    {symbols.length} хувьцаа хянаж байна
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400">Анхааруулга</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Өөрийн судалгаа хийхээ мартуузай
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">Зөвлөмж</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Өдөр бүр хянаж, шинэчилдэг байх
                  </p>
                </div>
              </div>

              <button
                onClick={getAdvice}
                disabled={loading}
                className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Шинэ зөвлөгөө авах
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

