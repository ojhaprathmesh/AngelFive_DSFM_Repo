"use client";

import { Activity, AlertCircle, BarChart3 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useChartLifecycle } from "../hooks/useChartLifecycle";
import { useChartSeries } from "../hooks/useChartSeries";
import { IndexType, useLiveIndexData } from "../hooks/useLiveIndexData";
import {
  ChartType,
  TimeFrame,
  useTradingChartData,
} from "../hooks/useTradingChartData";
import { MarketIndexTabs } from "./market-index-tabs";

export const TradingChart = React.memo(function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexType>("SENSEX");
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1D");
  const [chartType, setChartType] = useState<ChartType>("Area");

  const { indexState, error } = useLiveIndexData();
  const {
    chartData,
    chartDataLoading,
    chartDataEmpty,
    autoSwitchedFrom,
    setAutoSwitchedFrom,
  } = useTradingChartData(selectedIndex, timeFrame, setTimeFrame);

  // Persist chart type
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chartType");
      if (saved === "Area" || saved === "Candles")
        setChartType(saved as ChartType);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("chartType", chartType);
    } catch (e) {}
  }, [chartType]);

  const toggleChartType = useCallback(() => {
    setChartType((prev) => (prev === "Area" ? "Candles" : "Area"));
  }, []);

  // Initialize chart primitives
  const { chartRef } = useChartLifecycle({
    containerRef: chartContainerRef,
    options: {
      rightPriceScale: { borderColor: "#e5e7eb", visible: true },
      leftPriceScale: { visible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: false,
      handleScale: false,
    },
  });

  const { updateOptions } = useChartSeries({
    chartRef,
    type: chartType,
    data: chartData,
  });

  // Update dynamic coloring for Area series
  useEffect(() => {
    if (chartType === "Area" && chartData.length > 0) {
      const firstOpen = chartData[0].open ?? chartData[0].value;
      const lastClose =
        chartData[chartData.length - 1].close ??
        chartData[chartData.length - 1].value;
      const isPositive = lastClose >= firstOpen;
      updateOptions({
        lineColor: isPositive ? "#22c55e" : "#ef4444",
        topColor: isPositive
          ? "rgba(34, 197, 94, 0.3)"
          : "rgba(239, 68, 68, 0.3)",
        bottomColor: isPositive
          ? "rgba(34, 197, 94, 0.05)"
          : "rgba(239, 68, 68, 0.05)",
      });
    }
  }, [chartData, chartType, updateOptions]);

  const indices: IndexType[] = [
    "SENSEX",
    "NIFTY",
    "BANKNIFTY",
    "INDIAVIX",
    "FINNIFTY",
  ];
  const timeFrames: TimeFrame[] = ["1D", "5D", "1M", "6M", "1Y", "5Y", "Max"];

  const currentDataFallback = {
    symbol: selectedIndex,
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    dayRange: { low: 0, high: 0 },
  };

  const currentData = indexState[selectedIndex]
    ? {
        symbol: selectedIndex,
        price: indexState[selectedIndex]!.price,
        change: indexState[selectedIndex]!.change,
        changePercent: indexState[selectedIndex]!.changePercent,
        open: indexState[selectedIndex]!.open || 0,
        high: indexState[selectedIndex]!.high || 0,
        low: indexState[selectedIndex]!.low || 0,
        close: indexState[selectedIndex]!.close || 0,
        dayRange: {
          low: indexState[selectedIndex]!.low || 0,
          high: indexState[selectedIndex]!.high || 0,
        },
      }
    : currentDataFallback;

  if (error) {
    return (
      <Alert className="mx-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to load chart</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Index Overview
        </h2>
      </div>

      <MarketIndexTabs
        indices={indices}
        indexState={indexState}
        currentData={currentData}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
      />

      <div className="divider-line" />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Heatscale Visualization */}
        <div
          className="flex min-w-75 flex-1 flex-col justify-center lg:flex-1"
          role="complementary"
          aria-label="Market Data and Analysis Section"
        >
          <div className="p-3" style={{ zIndex: 1 }}>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Day's High/Low
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <div className="h-1.5 w-full rounded-full bg-linear-to-r from-[#d64d4d] to-[#029076]"></div>
                <div
                  className="absolute -top-2 transition-all duration-300"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((currentData.price - currentData.dayRange.low) / (currentData.dayRange.high - currentData.dayRange.low || 1)) * 100))}%`,
                    transform:
                      "translateX(-50%) translateY(-40%) rotate(180deg)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className="text-gray-800 dark:text-white"
                    fill="currentColor"
                  >
                    <path d="M8 2l4 6H4l4-6z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                <div className="flex flex-col">
                  <span>
                    {currentData.dayRange.low.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Low
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span>
                    {currentData.dayRange.high.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    High
                  </span>
                </div>
              </div>
              <div className="divide-custom grid grid-cols-4 gap-0 divide-x divide-dotted text-[12px] font-medium">
                <div className="flex flex-col pr-3">
                  <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    Open
                  </div>
                  <div className="font-numbers numeric-tabular text-sm font-semibold text-gray-900 dark:text-white">
                    {currentData.open.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="flex flex-col px-3">
                  <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    High
                  </div>
                  <div className="font-numbers numeric-tabular text-sm font-semibold text-green-600 dark:text-green-400">
                    {currentData.high.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="flex flex-col px-3">
                  <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    Low
                  </div>
                  <div className="font-numbers numeric-tabular text-sm font-semibold text-red-600 dark:text-red-400">
                    {currentData.low.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="flex flex-col pl-3">
                  <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    Close
                  </div>
                  <div className="font-numbers numeric-tabular text-sm font-semibold text-gray-900 dark:text-white">
                    {currentData.close.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="v-divider-air v-divider-air-chart mx-2 hidden self-center lg:block" />

        <div
          className="relative flex-1 rounded-lg lg:flex-1"
          style={{ zIndex: 1 }}
        >
          {chartDataLoading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 dark:bg-gray-900/95"
              style={{ zIndex: 10 }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Loading chart data...
                </span>
              </div>
            </div>
          )}

          {autoSwitchedFrom && !chartDataEmpty && (
            <div
              className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              style={{ zIndex: 10 }}
            >
              {autoSwitchedFrom} unavailable for {selectedIndex}, showing{" "}
              {timeFrame}
            </div>
          )}

          {!chartDataLoading && chartDataEmpty && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80"
              style={{ zIndex: 10 }}
            >
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <BarChart3 className="h-10 w-10 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  No chart data available for {timeFrame}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Intraday data may not be available for indices. Try stocks for
                  1D.
                </span>
              </div>
            </div>
          )}

          <div
            ref={chartContainerRef}
            className="h-70 w-full rounded-lg"
            style={{ visibility: chartDataLoading ? "hidden" : "visible" }}
          />

          <div className="flex items-center justify-between p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {timeFrames.map((tf) => (
                <Button
                  key={tf}
                  variant={timeFrame === tf ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setAutoSwitchedFrom(null);
                    setTimeFrame(tf);
                  }}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {tf}
                </Button>
              ))}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleChartType}
                className="h-8 rounded-full border-gray-200 bg-white px-3 text-xs text-gray-600 shadow-xs hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {chartType === "Area" ? "Area" : "Candles"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
