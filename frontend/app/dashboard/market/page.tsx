"use client";

import dynamic from "next/dynamic";

import MarketDiscovery from "@/features/market/components/market-discovery";
import { MarketErrorBoundary } from "@/features/market/error-boundary";

const TradingChart = dynamic(
  () =>
    import("@/features/market/components/trading-chart").then(
      (mod) => mod.TradingChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-70 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  },
);

export default function MarketPage() {
  return (
    <div className="min-h-screen w-full space-y-6 bg-gray-50 p-4 md:p-4 dark:bg-gray-900">
      <MarketErrorBoundary>
        <TradingChart />
      </MarketErrorBoundary>
      <MarketErrorBoundary>
        <MarketDiscovery />
      </MarketErrorBoundary>
    </div>
  );
}
