import { Check, ChevronLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StockItem } from "@/features/market/types";

interface WatchlistEditPanelProps {
  editPanelId: string;
  editPanelName: string;
  setEditPanelId: (id: string | null) => void;
  panelEditing: boolean;
  setPanelEditing: (val: boolean) => void;
  panelEditValue: string;
  setPanelEditValue: (val: string) => void;
  savePanelRename: () => void;
  panelSaving: boolean;
  uid: string | null;
  symbols: StockItem[];
  setSymbols: (symbols: StockItem[]) => void;
  watchlistService: any;
}

export function WatchlistEditPanel({
  editPanelId,
  editPanelName,
  setEditPanelId,
  panelEditing,
  setPanelEditing,
  panelEditValue,
  setPanelEditValue,
  savePanelRename,
  panelSaving,
  uid,
  symbols,
  setSymbols,
  watchlistService,
}: WatchlistEditPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditPanelId(null)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {panelEditing ? (
            <input
              value={panelEditValue}
              onChange={(e) => setPanelEditValue(e.target.value)}
              className="bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-sm"
              placeholder="Enter new name"
              onKeyDown={(e) => {
                if (e.key === "Enter") savePanelRename();
                if (e.key === "Escape") {
                  setPanelEditing(false);
                  setPanelEditValue("");
                }
              }}
            />
          ) : (
            <span className="truncate text-sm font-medium">
              {editPanelName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {panelEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={savePanelRename}
                disabled={panelSaving}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setPanelEditing(false);
                  setPanelEditValue("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPanelEditing(true);
                setPanelEditValue(editPanelName);
              }}
            >
              Rename
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
              Add Stock
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter symbol (e.g., RELIANCE)"
                className="bg-background flex-1 rounded-md border px-2 py-1.5 text-sm"
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && uid && editPanelId) {
                    const input = e.currentTarget;
                    const symbol = input.value.trim().toUpperCase();
                    if (symbol) {
                      try {
                        await watchlistService.addSymbol(
                          uid,
                          editPanelId,
                          symbol,
                        );
                        input.value = "";
                        const listSymbols = await watchlistService.getSymbols(
                          uid,
                          editPanelId,
                        );
                        const names = listSymbols
                          .map((s: any) => s.symbol)
                          .filter(Boolean);
                        if (names.length > 0) {
                          const resp = await fetch(
                            `/api/market/smartapi/quote`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ symbols: names }),
                            },
                          );
                          if (resp.ok) {
                            const json = await resp.json();
                            const q = Array.isArray(json?.quotes)
                              ? json.quotes
                              : [];
                            const mapped: StockItem[] = names.map(
                              (name: string) => {
                                const nameUpper = name.toUpperCase();
                                const qInfo = q.find(
                                  (x: any) =>
                                    x.symbol &&
                                    (x.symbol.toUpperCase() === nameUpper ||
                                      x.symbol.toUpperCase() ===
                                        `${nameUpper}-EQ` ||
                                      x.symbol
                                        .toUpperCase()
                                        .startsWith(`${nameUpper}-`)),
                                );
                                return {
                                  symbol: name,
                                  exchange: qInfo
                                    ? String(qInfo.exchange || "NSE")
                                    : "NSE",
                                  price: qInfo ? Number(qInfo.price || 0) : 0,
                                  changePct: qInfo
                                    ? Number(
                                        qInfo.changePercent ||
                                          qInfo.changePct ||
                                          0,
                                      )
                                    : 0,
                                  change: qInfo ? Number(qInfo.change || 0) : 0,
                                };
                              },
                            );
                            setSymbols(mapped);
                          }
                        }
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to add symbol",
                        );
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
              Stocks in Watchlist
            </label>
            <div className="space-y-1">
              {symbols.map((s) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5 dark:bg-gray-900"
                >
                  <span className="text-sm">{s.symbol}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async () => {
                      if (!uid || !editPanelId) return;
                      try {
                        await watchlistService.removeSymbol(
                          uid,
                          editPanelId,
                          s.symbol,
                        );
                        setSymbols(
                          symbols.filter((sym) => sym.symbol !== s.symbol),
                        );
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to remove symbol",
                        );
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {symbols.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No stocks in this watchlist
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
