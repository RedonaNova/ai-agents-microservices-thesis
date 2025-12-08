import { Suspense } from "react";
import { WatchlistContent } from "@/components/watchlist/WatchlistContent";
import { Loader2, Star } from "lucide-react";

export const metadata = {
  title: "Хяналтын жагсаалт | Redona",
  description: "Таны хянаж буй хувьцаанууд",
};

export default function WatchlistPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg ">
          <Star className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Хяналтын жагсаалт</h1>
          <p className="text-sm text-gray-500">
            МХБ болон дэлхийн хувьцаануудыг хянах, AI шинжилгээ авах
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
