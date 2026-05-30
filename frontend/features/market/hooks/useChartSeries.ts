import {
  AreaSeries,
  AreaSeriesPartialOptions,
  CandlestickSeries,
  CandlestickSeriesPartialOptions,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineSeriesPartialOptions,
  SeriesDataItemTypeMap,
} from "lightweight-charts";
import { useCallback, useEffect, useRef } from "react";

export type ChartType = "Area" | "Candles" | "Line";

interface UseChartSeriesProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  type: ChartType;
  data: any[];
  options?:
    | AreaSeriesPartialOptions
    | CandlestickSeriesPartialOptions
    | LineSeriesPartialOptions;
  autoFitContent?: boolean;
}

export function useChartSeries({
  chartRef,
  type,
  data,
  options,
  autoFitContent = true,
}: UseChartSeriesProps) {
  const seriesRef = useRef<ISeriesApi<"Area" | "Candlestick" | "Line"> | null>(
    null,
  );

  // Re-initialize series if type changes
  useEffect(() => {
    if (!chartRef.current) return;

    const currentChart = chartRef.current; // Copy ref value for cleanup

    // Cleanup old series
    if (seriesRef.current) {
      currentChart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    let series: ISeriesApi<"Area" | "Candlestick" | "Line">;

    if (type === "Area") {
      const areaOptions = {
        lineColor: "#9ca3af",
        topColor: "rgba(156, 163, 175, 0.3)",
        bottomColor: "rgba(156, 163, 175, 0.05)",
        lineWidth: 2 as any,
        ...(options as AreaSeriesPartialOptions),
      };
      series = chartRef.current.addSeries(AreaSeries, areaOptions as any);
    } else if (type === "Candles") {
      const candleOptions = {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        ...(options as CandlestickSeriesPartialOptions),
      };
      series = chartRef.current.addSeries(
        CandlestickSeries,
        candleOptions as any,
      );
    } else {
      const lineOptions = {
        color: "#3b82f6",
        lineWidth: 2 as any,
        ...(options as LineSeriesPartialOptions),
      };
      series = chartRef.current.addSeries(LineSeries, lineOptions as any);
    }

    seriesRef.current = series;

    return () => {
      if (currentChart && seriesRef.current) {
        currentChart.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }
    };
  }, [chartRef, type, options]);

  // Update data or options
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    // Set data safely
    try {
      if (type === "Area" || type === "Line") {
        seriesRef.current.setData(
          data as SeriesDataItemTypeMap["Area" | "Line"][],
        );
      } else if (type === "Candles") {
        seriesRef.current.setData(
          data as SeriesDataItemTypeMap["Candlestick"][],
        );
      }

      if (autoFitContent && chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (e) {
      console.error("[useChartSeries] Error setting data:", e);
    }
  }, [data, type, autoFitContent, chartRef]);

  // Expose an updater for options without remounting (e.g. dynamic coloring)
  const updateOptions = useCallback((newOptions: any) => {
    if (seriesRef.current) {
      seriesRef.current.applyOptions(newOptions);
    }
  }, []);

  return { seriesRef, updateOptions };
}
