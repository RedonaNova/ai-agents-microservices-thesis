import { getWatchlist } from "@/lib/actions/watchlist.actions";
import { getMSEStockBySymbol } from "@/lib/actions/mse-stocks.actions";
import { WatchlistClientUI } from "./WatchlistClientUI";

export async function WatchlistContentSSR() {
  const items = await getWatchlist();
  
  // Enrich MSE stocks with real price data
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      if (item.isMse) {
        const mseData = await getMSEStockBySymbol(item.symbol);
        if (mseData) {
          return {
            ...item,
            company: mseData.name || item.symbol,
            price: mseData.closingPrice,
            change: mseData.change,
            changePercent: mseData.changePercent,
          };
        }
      }
      return item;
    })
  );
  
  return <WatchlistClientUI initialItems={enrichedItems} />;
}

