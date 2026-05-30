"use client";

import { CrosshairMode, Time } from "lightweight-charts";
import { AlertCircle, Circle, MousePointer2, Move } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useChartLifecycle } from "../../market/hooks/useChartLifecycle";
import { useChartSeries } from "../../market/hooks/useChartSeries";
import {
  useYahooFinanceData,
  WatchlistTimeframe,
} from "../hooks/useYahooFinanceData";
import { WatchlistChartControls } from "./watchlist-chart-controls";

interface WatchlistChartProps {
  symbol: string;
  exchange?: string;
}

const calculateEMA = (
  data: any[],
  period: number,
): { time: Time; value: number }[] => {
  if (data.length < period) return [];
  const result: { time: Time; value: number }[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;

  for (let i = period - 1; i < data.length; i++) {
    if (i === period - 1) {
      ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
    }
    result.push({ time: data[i].time, value: ema });
  }
  return result;
};

const WATCHLIST_CHART_OPTIONS = {
  rightPriceScale: { borderColor: "#e5e7eb", visible: true },
  timeScale: {
    borderVisible: true,
    timeVisible: true,
    visible: true,
    rightOffset: 2,
    barSpacing: 6,
    fixLeftEdge: true,
    minimumHeight: 80,
  },
  crosshair: { mode: 1 },
  handleScroll: { mouseWheel: true, pressedMouseMove: true },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
};

export const WatchlistChart = React.memo(function WatchlistChart({
  symbol,
  exchange = "NSE",
}: WatchlistChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<WatchlistTimeframe>("1Y");
  const [showEMA, setShowEMA] = useState<boolean>(false);
  const [emaPeriod, setEmaPeriod] = useState<number>(9);
  const [toolMode, setToolMode] = useState<"pointer" | "cross" | "dot">(
    "pointer",
  );
  const toolCleanupRef = useRef<(() => void) | null>(null);

  const { data, isLoading, error } = useYahooFinanceData(symbol, timeframe);

  const { chartRef } = useChartLifecycle({
    containerRef: chartContainerRef,
    options: WATCHLIST_CHART_OPTIONS,
  });

  // Main Candlestick Series
  useChartSeries({
    chartRef,
    type: "Candles",
    data,
    autoFitContent: true,
  });

  // EMA Series
  const emaData = useMemo(
    () => calculateEMA(data, emaPeriod),
    [data, emaPeriod],
  );
  useChartSeries({
    chartRef,
    type: "Line",
    data: showEMA ? emaData : [],
    autoFitContent: false,
    options: { title: `EMA ${emaPeriod}`, color: "#3b82f6" },
  });

  // Visble Range specific for Yahoo timeframe
  const applyVisibleRangeByTimeframe = useCallback(
    (pointCount: number) => {
      if (!chartRef.current || pointCount <= 0) return;
      const barsByTimeframe: Record<WatchlistTimeframe, number> = {
        "1D": 78,
        "5D": 130,
        "1M": 22,
        "3M": 66,
        "6M": 132,
        "1Y": 252,
      };
      const bars = barsByTimeframe[timeframe];
      const from = Math.max(0, pointCount - bars);
      chartRef.current
        .timeScale()
        .setVisibleLogicalRange({ from, to: pointCount + 2 });
    },
    [timeframe, chartRef],
  );

  useEffect(() => {
    if (data.length > 0) {
      applyVisibleRangeByTimeframe(data.length);
    }
  }, [data, timeframe, applyVisibleRangeByTimeframe]);

  // Handle tool mode
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;
    const chart = chartRef.current;
    const container = chartContainerRef.current;

    if (toolCleanupRef.current) {
      toolCleanupRef.current();
      toolCleanupRef.current = null;
    }

    if (toolMode === "cross") {
      chart.applyOptions({
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { visible: true },
          horzLine: { visible: true },
        },
      });
      container.style.cursor = "crosshair";
    } else if (toolMode === "dot") {
      chart.applyOptions({
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
      });
      container.style.cursor = "none";

      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.width = "6px";
      el.style.height = "6px";
      el.style.backgroundColor = "#3b82f6";
      el.style.borderRadius = "50%";
      el.style.pointerEvents = "none";
      el.style.zIndex = "50";
      el.style.transform = "translate(-50%, -50%)";
      el.style.display = "none";
      container.appendChild(el);

      const handleMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        el.style.left = `${e.clientX - rect.left}px`;
        el.style.top = `${e.clientY - rect.top}px`;
        el.style.display = "block";
      };

      const handleLeave = () => {
        el.style.display = "none";
      };
      container.addEventListener("mousemove", handleMove);
      container.addEventListener("mouseleave", handleLeave);

      toolCleanupRef.current = () => {
        container.removeEventListener("mousemove", handleMove);
        container.removeEventListener("mouseleave", handleLeave);
        el.remove();
        container.style.cursor = "default";
      };
    } else {
      chart.applyOptions({
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
      });
      container.style.cursor = "default";
    }
  }, [toolMode, isLoading, chartRef]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chart Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-row overflow-hidden">
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
        <Button
          variant={toolMode === "pointer" ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setToolMode("pointer")}
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        <Button
          variant={toolMode === "cross" ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setToolMode("cross")}
        >
          <Move className="h-4 w-4" />
        </Button>
        <Button
          variant={toolMode === "dot" ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setToolMode("dot")}
        >
          <Circle className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WatchlistChartControls
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          showEMA={showEMA}
          setShowEMA={setShowEMA}
          emaPeriod={emaPeriod}
          setEmaPeriod={setEmaPeriod}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
              <Skeleton className="h-full w-full" />
            </div>
          )}
          <div
            ref={chartContainerRef}
            className="h-full w-full"
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
});
