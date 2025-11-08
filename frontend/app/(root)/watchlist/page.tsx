import { Suspense } from "react";
import { WatchlistContent } from "@/components/watchlist/WatchlistContent";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Watchlist | MSE Stocks",
  description: "Your personalized stock watchlist with AI insights",
};

export default function WatchlistPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Миний хяналтын жагсаалт</h1>
          <p className="text-gray-400 mt-1">
            Та өөрийн сонирхож буй хувьцаануудыг энд хадгалж, хянаж болно
          </p>
        </div>
      </div>

      <Suspense fallback={<WatchlistSkeleton />}>
        <WatchlistContent />
      </Suspense>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
    </div>
  );
}

