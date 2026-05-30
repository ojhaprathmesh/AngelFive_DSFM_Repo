import { Activity } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { WatchlistTimeframe } from "../hooks/useYahooFinanceData";

interface WatchlistChartControlsProps {
  timeframe: WatchlistTimeframe;
  setTimeframe: (tf: WatchlistTimeframe) => void;
  showEMA: boolean;
  setShowEMA: (show: boolean) => void;
  emaPeriod: number;
  setEmaPeriod: (period: number) => void;
}

export const WatchlistChartControls: React.FC<WatchlistChartControlsProps> = ({
  timeframe,
  setTimeframe,
  showEMA,
  setShowEMA,
  emaPeriod,
  setEmaPeriod,
}) => {
  const timeframes: WatchlistTimeframe[] = ["1D", "5D", "1M", "3M", "6M", "1Y"];

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        {timeframes.map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeframe(tf)}
            className="h-7 px-2 py-1 text-xs"
          >
            {tf}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Activity className="mr-1 h-4 w-4" />
              Indicators
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Indicators</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowEMA(!showEMA)}>
              EMA {emaPeriod} {showEMA ? "✓" : ""}
            </DropdownMenuItem>
            <div className="px-2 py-1 text-xs text-gray-500">EMA Period</div>
            <DropdownMenuItem onClick={() => setEmaPeriod(9)}>
              9 {emaPeriod === 9 ? "✓" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEmaPeriod(20)}>
              20 {emaPeriod === 20 ? "✓" : ""}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEmaPeriod(50)}>
              50 {emaPeriod === 50 ? "✓" : ""}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
