import { Suspense } from "react";
import { getMSEStockBySymbol } from "@/lib/actions/mse-stocks.actions";
import { GlobalStockDetail } from "@/components/stocks/GlobalStockDetail";
import { MSEStockDetail } from "@/components/stocks/MSEStockDetail";
import { Loader2 } from "lucide-react";

interface StockDetailsPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  
  // Check if this is an MSE stock by looking for -O-0000 suffix or checking DB
  const isMSEFormat = upperSymbol.includes('-O-0000');
  const mseStock = await getMSEStockBySymbol(upperSymbol);
  const isMSE = isMSEFormat || mseStock !== null;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <Suspense fallback={<StockDetailSkeleton />}>
        {isMSE ? (
          <MSEStockDetail symbol={upperSymbol} />
        ) : (
          <GlobalStockDetail symbol={upperSymbol} />
        )}
      </Suspense>
    </div>
  );
}

function StockDetailSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
    </div>
  );
}
