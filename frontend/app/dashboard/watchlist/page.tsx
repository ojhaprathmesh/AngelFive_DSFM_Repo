"use client";

import { GripVertical, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WatchlistChart } from "@/features/watchlists/components/watchlist-chart";
import { WatchlistEditPanel } from "@/features/watchlists/components/watchlist-edit-panel";
import { WatchlistList } from "@/features/watchlists/components/watchlist-list";
import {
  AddStockModal,
  CreateWatchlistModal,
} from "@/features/watchlists/components/watchlist-modals";
import { StockOverviewPanel } from "@/features/watchlists/components/watchlist-stock-overview";
import { WatchlistErrorBoundary } from "@/features/watchlists/error-boundary";
import { useWatchlistData } from "@/features/watchlists/hooks/use-watchlist-data";
import { watchlistService } from "@/features/watchlists/services/watchlists";

export default function WatchlistPage() {
  const {
    uid,
    watchlists,
    setWatchlists,
    selectedId,
    setSelectedId,
    loading,
    error,
    setError,
    symbols,
    setSymbols,
    loadingSymbols,
    selectedSymbol,
    setSelectedSymbol,
    selectedExchange,
    setSelectedExchange,
  } = useWatchlistData();

  // Local UI state
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
  const [mainTab, setMainTab] = useState<"Chart" | "Overview">("Chart");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [chartKey, setChartKey] = useState<number>(0);
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [newStockSymbol, setNewStockSymbol] = useState<string>("");
  const [addingStock, setAddingStock] = useState<boolean>(false);

  // Tabs scroll
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

  // Load counts when menu opens
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

  const handleAddStock = async () => {
    if (!uid || !selectedId || !newStockSymbol.trim()) return;
    const symbol = newStockSymbol.trim().toUpperCase();
    try {
      setAddingStock(true);
      await watchlistService.addSymbol(uid, selectedId, symbol);
      setShowAddStockModal(false);
      setNewStockSymbol("");

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
          const mapped = names.map((name) => {
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
            <WatchlistEditPanel
              editPanelId={editPanelId}
              editPanelName={editPanelName}
              setEditPanelId={setEditPanelId}
              panelEditing={panelEditing}
              setPanelEditing={setPanelEditing}
              panelEditValue={panelEditValue}
              setPanelEditValue={setPanelEditValue}
              savePanelRename={savePanelRename}
              panelSaving={panelSaving}
              uid={uid}
              symbols={symbols}
              setSymbols={setSymbols}
              watchlistService={watchlistService}
            />
          ) : (
            <WatchlistList
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setShowAddStockModal={setShowAddStockModal}
              loadingSymbols={loadingSymbols}
              symbols={symbols}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={setSelectedSymbol}
              setSelectedExchange={setSelectedExchange}
              setChartKey={setChartKey}
            />
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
                <WatchlistErrorBoundary>
                  <WatchlistChart
                    key={`${selectedSymbol}-${selectedExchange}-${chartKey}`}
                    symbol={selectedSymbol}
                    exchange={selectedExchange}
                  />
                </WatchlistErrorBoundary>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a stock from watchlist to view chart
                  </p>
                </div>
              )
            ) : selectedSymbol ? (
              <WatchlistErrorBoundary>
                <StockOverviewPanel
                  symbol={selectedSymbol}
                  exchange={selectedExchange}
                />
              </WatchlistErrorBoundary>
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

      <CreateWatchlistModal
        show={showCreate}
        onClose={() => setShowCreate(false)}
        newName={newName}
        setNewName={setNewName}
        handleCreate={handleCreate}
        creating={creating}
        error={error}
      />

      <AddStockModal
        show={showAddStockModal}
        onClose={() => {
          setShowAddStockModal(false);
          setNewStockSymbol("");
        }}
        newStockSymbol={newStockSymbol}
        setNewStockSymbol={setNewStockSymbol}
        handleAddStock={handleAddStock}
        addingStock={addingStock}
      />
    </div>
  );
}
