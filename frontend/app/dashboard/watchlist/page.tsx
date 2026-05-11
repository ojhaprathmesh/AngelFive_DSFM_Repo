"use client";

import {
  Check,
  ChevronLeft,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WatchlistChart } from "@/components/watchlist-chart";
import { StockOverviewPanel } from "@/components/watchlist-stock-overview";
import { useAuth } from "@/contexts/auth-context";
import { marketDataService } from "@/lib/market-data";
import { type WatchlistItem, watchlistService } from "@/lib/watchlists";

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

type StockItem = {
  symbol: string;
  exchange: string;
  price: number;
  changePct: number;
  change?: number;
};

interface StockCardProps {
  item: StockItem;
  isSelected: boolean;
  onSelect: (item: StockItem) => void;
}

function StockCard({ item, isSelected, onSelect }: StockCardProps) {
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
      className={`flex cursor-pointer items-center justify-between border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? bgColor : ""}`}
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

export default function WatchlistPage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid || null;

  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editPanelId, setEditPanelId] = useState<string | null>(null);
  const [editPanelName, setEditPanelName] = useState<string>("");
  const [panelEditing, setPanelEditing] = useState<boolean>(false);
  const [panelEditValue, setPanelEditValue] = useState<string>("");
  const [panelSaving, setPanelSaving] = useState<boolean>(false);
  const [symbols, setSymbols] = useState<StockItem[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState<boolean>(false);
  const [mainTab, setMainTab] = useState<"Chart" | "Overview">("Chart");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string>("NSE");
  const selectedSymbolRef = useRef<string | null>(null);
  const [chartKey, setChartKey] = useState<number>(0);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [newStockSymbol, setNewStockSymbol] = useState<string>("");
  const [addingStock, setAddingStock] = useState<boolean>(false);

  // Fetch market indices (SENSEX, NIFTY)
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const [sensexData, niftyData] = await Promise.all([
          marketDataService.getMarketDataWithStatus("BSE:SENSEX"),
          marketDataService.getMarketDataWithStatus("NSE:NIFTY"),
        ]);

        setMarketIndices([
          {
            name: "SENSEX",
            value: sensexData.data?.price || 0,
            change: sensexData.data?.change || 0,
            changePercent: sensexData.data?.changePercent || 0,
            isPositive: (sensexData.data?.change || 0) >= 0,
          },
          {
            name: "NIFTY",
            value: niftyData.data?.price || 0,
            change: niftyData.data?.change || 0,
            changePercent: niftyData.data?.changePercent || 0,
            isPositive: (niftyData.data?.change || 0) >= 0,
          },
        ]);
      } catch (err) {
        console.error("Error fetching market indices:", err);
      }
    };

    void fetchIndices();
    const interval = setInterval(fetchIndices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = watchlistService.subscribe(
      uid,
      (items) => {
        setWatchlists(items);
        if (!selectedId && items.length > 0) {
          setSelectedId(items[0].id);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [selectedId, uid]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const horiz = Math.abs(e.deltaX) >= Math.abs(e.deltaY);
      const delta = horiz ? e.deltaX : e.deltaY;
      if (!horiz) e.preventDefault();
      try {
        el.scrollBy({ left: delta, behavior: "smooth" });
      } catch {
        el.scrollLeft += delta;
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const numberedTabs = useMemo(() => {
    return watchlists.map((wl, idx) => ({
      id: wl.id,
      number: idx + 1,
      name: wl.name,
    }));
  }, [watchlists]);

  useEffect(() => {
    if (!menuOpen || !uid) return;
    (async () => {
      try {
        const c = await watchlistService.getCounts(uid);
        setCounts(c);
      } catch {}
    })();
  }, [menuOpen, uid]);

  const applyReorder = async (fromId: string, toId: string) => {
    const current = [...watchlists];
    const fromIdx = current.findIndex((w) => w.id === fromId);
    const toIdx = current.findIndex((w) => w.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const moving = current[fromIdx];
    current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moving);
    setWatchlists(current);
    if (!uid) return;
    try {
      await watchlistService.reorder(
        uid,
        current.map((w) => w.id),
      );
    } catch {}
  };

  const openEditPanel = (id: string, name: string) => {
    setMenuOpen(false);
    setEditPanelId(id);
    setEditPanelName(name);
    setPanelEditing(false);
    setPanelEditValue("");
  };

  const savePanelRename = async () => {
    if (!uid || !editPanelId) return;
    try {
      setPanelSaving(true);
      const trimmed = panelEditValue.trim();
      if (!trimmed) return;
      const exists = watchlists.some(
        (w) =>
          w.name.toLowerCase() === trimmed.toLowerCase() &&
          w.id !== editPanelId,
      );
      if (exists) return;
      await watchlistService.rename(uid, editPanelId, trimmed);
      setEditPanelName(trimmed);
      setPanelEditing(false);
      setPanelEditValue("");
    } finally {
      setPanelSaving(false);
    }
  };

  const handleAddStock = async () => {
    if (!uid || !selectedId || !newStockSymbol.trim()) return;
    const symbol = newStockSymbol.trim().toUpperCase();
    try {
      setAddingStock(true);
      await watchlistService.addSymbol(uid, selectedId, symbol);
      setShowAddStockModal(false);
      setNewStockSymbol("");

      // Refresh symbols
      const listSymbols = await watchlistService.getSymbols(uid, selectedId);
      const names = listSymbols.map((s) => s.symbol).filter(Boolean);
      if (names.length > 0) {
        const resp = await fetch(`/api/market/smartapi/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: names }),
        });
        if (resp.ok) {
          const json = await resp.json();
          const q = Array.isArray(json?.quotes) ? json.quotes : [];
          const mapped: StockItem[] = names.map((name) => {
            const nameUpper = name.toUpperCase();
            const qInfo = q.find(
              (x: any) =>
                x.symbol &&
                (x.symbol.toUpperCase() === nameUpper ||
                  x.symbol.toUpperCase() === `${nameUpper}-EQ` ||
                  x.symbol.toUpperCase().startsWith(`${nameUpper}-`)),
            );
            return {
              symbol: name,
              exchange: qInfo ? String(qInfo.exchange || "NSE") : "NSE",
              price: qInfo ? Number(qInfo.price || 0) : 0,
              changePct: qInfo
                ? Number(qInfo.changePercent || qInfo.changePct || 0)
                : 0,
              change: qInfo ? Number(qInfo.change || 0) : 0,
            };
          });
          setSymbols(mapped);
          // Auto-select the newly added symbol
          const addedStock = mapped.find((s) => s.symbol === symbol);
          if (addedStock) {
            setSelectedSymbol(addedStock.symbol);
            setSelectedExchange(addedStock.exchange);
          }
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setAddingStock(false);
    }
  };

  // Fetch and update stock prices
  useEffect(() => {
    if (!uid || !selectedId) return;

    const fetchSymbols = async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoadingSymbols(true);
        }
        const listSymbols = await watchlistService.getSymbols(uid, selectedId);
        const names = listSymbols.map((s) => s.symbol).filter(Boolean);
        if (names.length > 0) {
          const resp = await fetch(`/api/market/smartapi/quote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols: names }),
          });
          if (resp.ok) {
            const json = await resp.json();
            const q = Array.isArray(json?.quotes) ? json.quotes : [];
            const mapped: StockItem[] = names.map((name) => {
              const nameUpper = name.toUpperCase();
              const qInfo = q.find(
                (x: any) =>
                  x.symbol &&
                  (x.symbol.toUpperCase() === nameUpper ||
                    x.symbol.toUpperCase() === `${nameUpper}-EQ` ||
                    x.symbol.toUpperCase().startsWith(`${nameUpper}-`)),
              );
              return {
                symbol: name,
                exchange: qInfo ? String(qInfo.exchange || "NSE") : "NSE",
                price: qInfo ? Number(qInfo.price || 0) : 0,
                changePct: qInfo
                  ? Number(qInfo.changePercent || qInfo.changePct || 0)
                  : 0,
                change: qInfo ? Number(qInfo.change || 0) : 0,
              };
            });
            // Update prices without showing loading
            setSymbols((prev) => {
              // Preserve selection and update prices
              return mapped.map((newItem) => {
                const existing = prev.find((p) => p.symbol === newItem.symbol);
                return existing ? { ...existing, ...newItem } : newItem;
              });
            });
            // Auto-select first symbol if none selected
            if (!selectedSymbolRef.current && mapped.length > 0) {
              setSelectedSymbol(mapped[0].symbol);
              setSelectedExchange(mapped[0].exchange);
            }
          } else {
            if (showLoading) {
              setSymbols([]);
            }
          }
        } else {
          if (showLoading) {
            setSymbols([]);
          }
        }
      } catch {
        if (showLoading) {
          setSymbols([]);
        }
      } finally {
        if (showLoading) {
          setLoadingSymbols(false);
        }
      }
    };

    // Initial load with loading
    void fetchSymbols(true);
    // Poll for updates every 10 seconds without loading
    const interval = setInterval(() => fetchSymbols(false), 10000);
    return () => clearInterval(interval);
  }, [uid, selectedId]);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  // Filter symbols based on search
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return symbols;
    const query = searchQuery.toLowerCase();
    return symbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(query) ||
        s.exchange.toLowerCase().includes(query),
    );
  }, [symbols, searchQuery]);

  const handleCreate = async () => {
    if (!uid) return;
    try {
      setError(null);
      setCreating(true);
      const trimmed = newName.trim();
      if (!trimmed) {
        setError("Name is required");
        return;
      }
      const exists = watchlists.some(
        (w) => w.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) {
        setError("A watchlist with this name already exists");
        return;
      }
      await watchlistService.create(uid, trimmed);
      setShowCreate(false);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create watchlist");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar - Watchlist */}
        <aside className="flex w-80 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {/* Watchlist Tabs */}
          <div className="flex h-12 items-center justify-between border-b border-gray-200 px-3 dark:border-gray-700">
            <div
              ref={tabsRef}
              className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth whitespace-nowrap"
            >
              {loading && (
                <span className="text-xs text-gray-500">Loading…</span>
              )}
              {!loading && numberedTabs.length === 0 && (
                <span className="text-xs text-gray-500">No watchlists</span>
              )}
              {numberedTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={selectedId === tab.id ? "default" : "ghost"}
                  size="sm"
                  title={tab.name}
                  onClick={() => {
                    setSelectedId(tab.id);
                    setSelectedSymbol(null);
                  }}
                  className="h-8 w-8 p-0 text-xs font-semibold"
                >
                  {tab.number}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Add watchlist"
                title="Add watchlist"
                onClick={() => setShowCreate(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Settings"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-68.75">
                <div className="px-2 py-1.5 text-xs font-medium">
                  Watchlists
                </div>
                <div className="space-y-1">
                  {numberedTabs.map((t) => {
                    const wl = watchlists.find((w) => w.id === t.id)!;
                    return (
                      <div
                        key={wl.id}
                        className="hover:bg-accent/30 grid h-7 cursor-grab grid-cols-[22px_18px_1fr_32px_32px_32px] items-center gap-1 rounded px-1"
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(wl.id);
                          e.dataTransfer.setData("text/plain", wl.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromId =
                            draggingId || e.dataTransfer.getData("text/plain");
                          const toId = wl.id;
                          setDraggingId(null);
                          if (fromId && fromId !== toId)
                            void applyReorder(fromId, toId);
                        }}
                      >
                        <div className="text-muted-foreground px-1 text-[11px]">
                          {t.number}
                        </div>
                        <div className="flex items-center justify-center">
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex items-center px-1">
                          <span className="truncate text-[12px]">
                            {wl.name}
                          </span>
                        </div>
                        <div className="text-muted-foreground px-1 text-[11px]">
                          {(counts[wl.id] ?? 0).toString()}
                        </div>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditPanel(wl.id, wl.name)}
                            aria-label="Edit"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            onClick={async () => {
                              if (!uid) return;
                              const ok = window.confirm(
                                `Delete watchlist "${wl.name}"?`,
                              );
                              if (!ok) return;
                              try {
                                await watchlistService.remove(uid, wl.id);
                              } catch {}
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Edit Panel or Stock List */}
          {editPanelId ? (
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
                        if (e.key === "Enter") void savePanelRename();
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
                                // Refresh symbols
                                const listSymbols =
                                  await watchlistService.getSymbols(
                                    uid,
                                    editPanelId,
                                  );
                                const names = listSymbols
                                  .map((s) => s.symbol)
                                  .filter(Boolean);
                                if (names.length > 0) {
                                  const resp = await fetch(
                                    `/api/market/smartapi/quote`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ symbols: names }),
                                    },
                                  );
                                  if (resp.ok) {
                                    const json = await resp.json();
                                    const q = Array.isArray(json?.quotes)
                                      ? json.quotes
                                      : [];
                                    const mapped: StockItem[] = names.map(
                                      (name) => {
                                        const nameUpper = name.toUpperCase();
                                        const qInfo = q.find(
                                          (x: any) =>
                                            x.symbol &&
                                            (x.symbol.toUpperCase() ===
                                              nameUpper ||
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
                                          price: qInfo
                                            ? Number(qInfo.price || 0)
                                            : 0,
                                          changePct: qInfo
                                            ? Number(
                                                qInfo.changePercent ||
                                                  qInfo.changePct ||
                                                  0,
                                              )
                                            : 0,
                                          change: qInfo
                                            ? Number(qInfo.change || 0)
                                            : 0,
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
                                  symbols.filter(
                                    (sym) => sym.symbol !== s.symbol,
                                  ),
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
          ) : (
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
                            "[WatchlistPage] 🔵 Stock clicked:",
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
          )}
        </aside>

        {/* Main Chart Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
            <div className="flex h-12 items-center gap-6">
              {(["Chart", "Overview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMainTab(t)}
                  className={`relative -mb-px pb-2 text-sm font-medium transition-colors ${
                    mainTab === t
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {t}
                  {mainTab === t && (
                    <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mainTab === "Chart" ? (
              selectedSymbol ? (
                <WatchlistChart
                  key={`${selectedSymbol}-${selectedExchange}-${chartKey}`}
                  symbol={selectedSymbol}
                  exchange={selectedExchange}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a stock from watchlist to view chart
                  </p>
                </div>
              )
            ) : selectedSymbol ? (
              <StockOverviewPanel
                symbol={selectedSymbol}
                exchange={selectedExchange}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Select a stock from watchlist to view overview
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Watchlist Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-sm rounded-md border bg-white shadow-lg dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-3">
              <h2 className="text-sm font-semibold">Create Watchlist</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowCreate(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Watchlist name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-background w-full rounded-md border px-2 py-1 text-sm"
                placeholder="Enter name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
              />
              {error && <div className="text-xs text-red-600">{error}</div>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowAddStockModal(false);
            setNewStockSymbol("");
          }}
        >
          <div
            className="w-full max-w-sm rounded-md border bg-white shadow-lg dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-3">
              <h2 className="text-sm font-semibold">Add Stock</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setShowAddStockModal(false);
                  setNewStockSymbol("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Stock Symbol
              </label>
              <input
                value={newStockSymbol}
                onChange={(e) =>
                  setNewStockSymbol(e.target.value.toUpperCase())
                }
                className="bg-background w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="Enter symbol (e.g., RELIANCE, TCS)"
                onKeyDown={async (e) => {
                  if (
                    e.key === "Enter" &&
                    newStockSymbol.trim() &&
                    !addingStock
                  ) {
                    await handleAddStock();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the stock symbol in uppercase (e.g., RELIANCE, TCS, INFY)
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddStockModal(false);
                    setNewStockSymbol("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddStock}
                  disabled={addingStock || !newStockSymbol.trim()}
                >
                  {addingStock ? "Adding…" : "Add Stock"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
