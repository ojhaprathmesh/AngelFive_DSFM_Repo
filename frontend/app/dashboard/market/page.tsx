import { TradingChart } from "@/components/trading-chart";
import MarketDiscovery from "@/features/market/components/market-discovery";
import { MarketErrorBoundary } from "@/features/market/error-boundary";

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
