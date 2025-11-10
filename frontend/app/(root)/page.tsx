import TradingViewWidget from "@/components/TradingViewWidget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MSEStocksTable } from "@/components/mse/MSEStocksTable";
import { MSEHeatmap } from "@/components/mse/MSEHeatmap";
import { MSEHistoryChart } from "@/components/mse/MSEHistoryChart";
import {
  HEATMAP_WIDGET_CONFIG,
  MARKET_DATA_WIDGET_CONFIG,
  MARKET_OVERVIEW_WIDGET_CONFIG,
  TOP_STORIES_WIDGET_CONFIG,
} from "@/lib/constants";

export default function Home() {
  const scriptUrl =
    "https://s3.tradingview.com/external-embedding/embed-widget-";
  
  return (
    <div className="flex min-h-screen home-wrapper">
      <Tabs defaultValue="global" className="w-full">
        <div className="mb-6">
          <TabsList>
            <TabsTrigger value="global">Global Stocks</TabsTrigger>
            <TabsTrigger value="mse">MSE Stocks</TabsTrigger>
            <TabsTrigger value="watchlist">My Watchlist</TabsTrigger>
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
            {/* Sector Heatmap */}
            <MSEHeatmap />

            {/* Top Movers */}
            <MSEHistoryChart />

            {/* Stocks Data Table */}
            <MSEStocksTable />
          </div>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist">
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Миний хяналтын жагсаалт
              </h2>
              <p className="text-gray-400">
                Your combined watchlist (Global + MSE) will be displayed here
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
