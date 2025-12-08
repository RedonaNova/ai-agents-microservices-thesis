import { getMSEStocks } from "@/lib/actions/mse-stocks.actions";
import { MSEStocksTableClient } from "./MSEStocksTableClient";

export async function MSEStocksTableSSR() {
  const stocks = await getMSEStocks(200);
  
  return <MSEStocksTableClient initialStocks={stocks} />;
}


