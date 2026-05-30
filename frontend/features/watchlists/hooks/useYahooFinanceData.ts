import { BusinessDay, Time } from "lightweight-charts";
import { useCallback, useEffect, useState } from "react";

export type WatchlistTimeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y";

export function useYahooFinanceData(
  symbol: string,
  timeframe: WatchlistTimeframe,
) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (sym: string, tf: WatchlistTimeframe) => {
    let cleanSymbol = sym.toUpperCase().trim();
    cleanSymbol = cleanSymbol.replace(/-EQ$/, "");
    cleanSymbol = cleanSymbol.replace(/^NSE:/, "");

    try {
      const response = await fetch(
        `/api/market/yahoo-finance?symbol=${encodeURIComponent(cleanSymbol)}&timeframe=${tf}`,
      );

      if (!response.ok) {
        return [];
      }

      const resData = await response.json();
      if (resData.candles && resData.candles.length > 0) {
        return resData.candles;
      }
      return [];
    } catch (e: any) {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!symbol) return;

    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const candles = await fetchData(symbol, timeframe);
        if (!candles || candles.length === 0) {
          setError(
            `Unable to fetch chart data for ${symbol} from Yahoo Finance. Please check if the symbol is correct.`,
          );
          setData([]);
        } else {
          const allData = candles.map((c: any) => {
            const date = new Date(c[0]);
            const time: BusinessDay = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            };
            return {
              time: time as Time,
              open: c[1],
              high: c[2],
              low: c[3],
              close: c[4],
            };
          });
          setData(allData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load chart");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [symbol, timeframe, fetchData]);

  return { data, isLoading, error };
}
