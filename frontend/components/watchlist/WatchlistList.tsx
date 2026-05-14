import { Filter, Plus, Search } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { StockItem } from "@/lib/types/market";

import { StockCard } from "./StockCard";

interface WatchlistListProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setShowAddStockModal: (val: boolean) => void;
  loadingSymbols: boolean;
  symbols: StockItem[];
  selectedSymbol: string | null;
  setSelectedSymbol: (val: string) => void;
  setSelectedExchange: (val: string) => void;
  setChartKey: React.Dispatch<React.SetStateAction<number>>;
}

export function WatchlistList({
  searchQuery,
  setSearchQuery,
  setShowAddStockModal,
  loadingSymbols,
  symbols,
  selectedSymbol,
  setSelectedSymbol,
  setSelectedExchange,
  setChartKey,
}: WatchlistListProps) {
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return symbols;
    const query = searchQuery.toLowerCase();
    return symbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.exchange.toLowerCase().includes(query),
    );
  }, [symbols, searchQuery]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border bg-white py-1.5 pr-8 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-900"
            />
            <Filter className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddStockModal(true)}
            className="whitespace-nowrap"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Stock List */}
      <div className="flex-1 overflow-y-auto">
        {loadingSymbols && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        )}
        {!loadingSymbols && filteredSymbols.length > 0 && (
          <div>
            {filteredSymbols.map((s) => (
              <StockCard
                key={s.symbol}
                item={s}
                isSelected={selectedSymbol === s.symbol}
                onSelect={(item) => {
                  console.log(
                    "[WatchlistList] 🔵 Stock clicked:",
                    item.symbol,
                    item.exchange,
                  );
                  setSelectedSymbol(item.symbol);
                  setSelectedExchange(item.exchange);
                  setChartKey((prev) => prev + 1);
                }}
              />
            ))}
          </div>
        )}
        {!loadingSymbols &&
          filteredSymbols.length === 0 &&
          symbols.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-12">
              <div className="mb-4 text-center">
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  No stocks in this watchlist
                </p>
                <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                  Add stocks to track their prices and performance
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddStockModal(true)}
                className="whitespace-nowrap"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Your First Stock
              </Button>
            </div>
          )}
        {!loadingSymbols &&
          filteredSymbols.length === 0 &&
          symbols.length > 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No stocks match your search
            </div>
          )}
      </div>
    </div>
  );
}
