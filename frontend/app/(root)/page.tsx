import TradingViewWidget from "@/components/TradingViewWidget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MSEStocksTableSSR } from "@/components/mse/MSEStocksTableSSR";
import { MSETopMoversSSR } from "@/components/mse/MSETopMoversSSR";
import { WatchlistContentSSR } from "@/components/watchlist/WatchlistContentSSR";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import {
  HEATMAP_WIDGET_CONFIG,
  MARKET_DATA_WIDGET_CONFIG,
  MARKET_OVERVIEW_WIDGET_CONFIG,
  TOP_STORIES_WIDGET_CONFIG,
} from "@/lib/constants";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const scriptUrl =
    "https://s3.tradingview.com/external-embedding/embed-widget-";
  
  return (
    <div className="flex min-h-screen home-wrapper">
      <Tabs defaultValue="global" className="w-full">
        <div className="mb-6">
          <TabsList>
            <TabsTrigger value="global">Дэлхий нийт</TabsTrigger>
            <TabsTrigger value="mse">МХБ</TabsTrigger>
            <TabsTrigger value="watchlist">Хяналтын жагсаалт</TabsTrigger>
          </TabsList>
        </div>

        {/* Global Stocks Tab */}
        <TabsContent value="global">
          <section className="grid w-full gap-8 home-section">
            <div className="md:col-span-1 xl:col-span-1">
              <TradingViewWidget
                title="Зах зээлийн мэдээ"
                scriptUrl={`${scriptUrl}market-overview.js`}
                config={MARKET_OVERVIEW_WIDGET_CONFIG}
                height={600}
                className="custom-chart"
              />
            </div>
            <div className="md:col-span-1 xl:col-span-2">
              <TradingViewWidget
                title="Хувьцааний Хитмап(Heatmap)"
                scriptUrl={`${scriptUrl}stock-heatmap.js`}
                config={HEATMAP_WIDGET_CONFIG}
                height={600}
                className="custom-chart"
              />
            </div>
          </section>
          <section className="grid w-full gap-8 home-section mt-8">
            <div className="h-full md:col-span-1 xl:col-span-1">
              <TradingViewWidget
                scriptUrl={`${scriptUrl}timeline.js`}
                config={TOP_STORIES_WIDGET_CONFIG}
                height={600}
              />
            </div>
            <div className="h-full md:col-span-1 xl:col-span-2">
              <TradingViewWidget
                scriptUrl={`${scriptUrl}market-quotes.js`}
                config={MARKET_DATA_WIDGET_CONFIG}
                height={600}
              />
            </div>
          </section>
        </TabsContent>

        {/* MSE Stocks Tab */}
        <TabsContent value="mse">
          <div className="space-y-6">
            <Suspense fallback={<LoadingSkeleton />}>
              <MSETopMoversSSR />
            </Suspense>

            <Suspense fallback={<LoadingSkeleton />}>
              <MSEStocksTableSSR />
            </Suspense>
          </div>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist">
          <Suspense fallback={<LoadingSkeleton />}>
            <WatchlistContentSSR />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
    </div>
  );
}
