import { TrendingDown, TrendingUp } from "lucide-react";

import type { StockItem } from "@/lib/types/market";

interface StockCardProps {
  item: StockItem;
  isSelected: boolean;
  onSelect: (item: StockItem) => void;
}

export function StockCard({ item, isSelected, onSelect }: StockCardProps) {
  const positive = item.changePct >= 0;
  const PriceIcon = positive ? TrendingUp : TrendingDown;
  const color = positive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
  const bgColor = positive
    ? "bg-green-50 dark:bg-green-900/20"
    : "bg-red-50 dark:bg-red-900/20";
  const change = item.change || (item.price * item.changePct) / 100;

  return (
    <div
      className={`flex cursor-pointer items-center justify-between border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected ? bgColor : ""
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(item);
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {item.symbol}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {item.exchange}
          </span>
        </div>
      </div>
      <div className={`flex flex-col items-end ${color}`}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold">
            ₹
            {item.price.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <PriceIcon className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs font-medium">
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)} ({change >= 0 ? "+" : ""}
          {item.changePct.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}
