import { useCallback, useEffect, useRef, useState } from "react";

import type { ReturnsData } from "@/features/dsfm/types";

interface UseReturnsDataReturn {
  data: ReturnsData | null;
  loading: boolean;
  error: string | null;
  priceChartRef: React.RefObject<HTMLDivElement | null>;
  returnsChartRef: React.RefObject<HTMLDivElement | null>;
}

export function useReturnsData(
  symbol: string,
  timeframe: string,
): UseReturnsDataReturn {
  const [data, setData] = useState<ReturnsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceChartRef = useRef<HTMLDivElement>(null);
  const returnsChartRef = useRef<HTMLDivElement>(null);

  const renderPriceChart = useCallback(
    (prices: number[], timestamps?: string[]) => {
      if (!priceChartRef.current || prices.length === 0) return;
      import("lightweight-charts").then(
        ({ createChart, AreaSeries, ColorType }) => {
          if (!priceChartRef.current) return;
          priceChartRef.current.innerHTML = "";
          const chart = createChart(priceChartRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: "transparent" },
              textColor: "#374151",
            },
            width: priceChartRef.current.clientWidth,
            height: 300,
            grid: {
              vertLines: { color: "transparent" },
              horzLines: { color: "#e5e7eb" },
            },
          });
          const series = chart.addSeries(AreaSeries, {
            lineColor: "#3b82f6",
            topColor: "rgba(59, 130, 246, 0.3)",
            bottomColor: "rgba(59, 130, 246, 0.05)",
            lineWidth: 2,
          });
          const useTimestamps =
            !!timestamps && timestamps.length === prices.length;
          if (!useTimestamps) {
            chart.applyOptions({
              timeScale: {
                tickMarkFormatter: (t: unknown) =>
                  `${typeof t === "number" ? t : ""}`,
              },
            });
          }
          const chartData = prices.map((price, index) => {
            if (useTimestamps && timestamps && timestamps[index]) {
              const date = new Date(timestamps[index]);
              return {
                time: Math.floor(
                  date.getTime() / 1000,
                ) as import("lightweight-charts").Time,
                value: price,
              };
            }
            return {
              time: index as import("lightweight-charts").Time,
              value: price,
            };
          });
          series.setData(chartData);
          chart.timeScale().fitContent();
        },
      );
    },
    [],
  );

  const renderReturnsChart = useCallback(
    (returns: number[], timestamps?: string[]) => {
      if (!returnsChartRef.current || returns.length === 0) return;
      import("lightweight-charts").then(
        ({ createChart, AreaSeries, ColorType }) => {
          if (!returnsChartRef.current) return;
          returnsChartRef.current.innerHTML = "";
          const chart = createChart(returnsChartRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: "transparent" },
              textColor: "#374151",
            },
            width: returnsChartRef.current.clientWidth,
            height: 300,
            grid: {
              vertLines: { color: "transparent" },
              horzLines: { color: "#e5e7eb" },
            },
          });
          const series = chart.addSeries(AreaSeries, {
            lineColor: "#10b981",
            topColor: "rgba(16, 185, 129, 0.3)",
            bottomColor: "rgba(16, 185, 129, 0.05)",
            lineWidth: 2,
          });
          const useTimestamps =
            !!timestamps && timestamps.length >= returns.length + 1;
          if (!useTimestamps) {
            chart.applyOptions({
              timeScale: {
                tickMarkFormatter: (t: unknown) =>
                  `${typeof t === "number" ? t : ""}`,
              },
            });
          }
          const chartData = returns.map((ret, index) => {
            if (useTimestamps && timestamps && timestamps[index + 1]) {
              const date = new Date(timestamps[index + 1]);
              return {
                time: Math.floor(
                  date.getTime() / 1000,
                ) as import("lightweight-charts").Time,
                value: ret * 100,
              };
            }
            return {
              time: index as import("lightweight-charts").Time,
              value: ret * 100,
            };
          });
          series.setData(chartData);
          chart.timeScale().fitContent();
        },
      );
    },
    [],
  );

  const fetchReturnsData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const resp = await fetch(
        `/api/dsfm/returns?symbol=${symbol}&timeframe=${timeframe}`,
      );
      const contentType = resp.headers.get("content-type");
      if (resp.ok && contentType && contentType.includes("application/json")) {
        const result: ReturnsData = await resp.json();
        setData(result);
        setError(null);
        setTimeout(() => {
          renderPriceChart(result.prices, result.timestamps);
          renderReturnsChart(result.logReturns, result.timestamps);
        }, 100);
      } else {
        let errorMessage = `Failed to fetch data (${resp.status} ${resp.statusText})`;
        try {
          const responseClone = resp.clone();
          if (contentType && contentType.includes("application/json")) {
            const errorData = await responseClone.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const text = await responseClone.text();
            if (text) {
              try {
                const jsonData = JSON.parse(text);
                errorMessage =
                  jsonData.error || jsonData.message || errorMessage;
              } catch {
                errorMessage = text;
              }
            }
          }
        } catch {
          // ignore parse error
        }
        if (
          errorMessage.includes("SmartAPI") ||
          errorMessage.includes("JWT token") ||
          errorMessage.includes("SMARTAPI")
        ) {
          errorMessage = "SmartAPI credentials not configured";
        }
        setError(errorMessage);
      }
    } catch (e: unknown) {
      const errorMessage =
        (e as Error).message ||
        "Network error. Make sure backend is running on port 5000.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, renderPriceChart, renderReturnsChart]);

  useEffect(() => {
    if (symbol) {
      void fetchReturnsData();
    }
  }, [symbol, timeframe, fetchReturnsData]);

  return { data, loading, error, priceChartRef, returnsChartRef };
}
