import { getTopMovers } from "@/lib/actions/mse-stocks.actions";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

export async function MSETopMoversSSR() {
  const { gainers, losers } = await getTopMovers();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Gainers */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-100">Өсөлттэй хувьцаа</h3>
        </div>
        <div className="space-y-3">
          {gainers.map((stock, index) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
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
                  ₮{stock.closingPrice.toLocaleString('mn-MN')}
                </div>
                <div className="text-sm font-bold text-green-400">
                  +{stock.changePercent.toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
          {gainers.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              Өсөлттэй хувьцаа алга
            </div>
          )}
        </div>
      </div>

      {/* Top Losers */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-gray-100">Бууралттай хувьцаа</h3>
        </div>
        <div className="space-y-3">
          {losers.map((stock, index) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
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
                  ₮{stock.closingPrice.toLocaleString('mn-MN')}
                </div>
                <div className="text-sm font-bold text-red-400">
                  {stock.changePercent.toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
          {losers.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              Бууралттай хувьцаа алга
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

