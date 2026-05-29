"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "most-bought"
  | "top-movers"
  | "top-performers"
  | "pocket-friendly";

type SortKey = "symbol" | "price" | "change" | "changePercent" | "volume";
type SortDir = "asc" | "desc";
type PFTier = "all" | "under50" | "under100" | "under200";
type PerfTf = "1W" | "1M" | "1Y" | "5Y";

interface StockItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  tier?: "under50" | "under100" | "under200";
}

const SECTION_LABELS: Record<Section, string> = {
  "most-bought": "Most Bought Stocks",
  "top-movers": "Top Movers",
  "top-performers": "Top Performers",
  "pocket-friendly": "Pocket Friendly Stocks",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PriceBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${
        up
          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`cursor-pointer px-4 py-3 text-left text-xs font-semibold text-gray-500 transition-colors select-none hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-500" />
          ) : (
            <ArrowDown className="h-3 w-3 text-blue-500" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </th>
  );
}

// ─── Stock Table ──────────────────────────────────────────────────────────────

function StockTable({
  items,
  sortKey,
  sortDir,
  onSort,
  showTier = false,
}: {
  items: StockItem[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  showTier?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No stocks match your filters.
      </div>
    );
  }

  const tierLabel: Record<string, string> = {
    under50: "< ₹50",
    under100: "< ₹100",
    under200: "< ₹200",
  };

  return (
    <div className="modern-scrollbar relative flex-1 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <tr>
            <th className="w-8 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
              #
            </th>
            <SortTh
              label="Symbol"
              sortKey="symbol"
              current={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Price (₹)"
              sortKey="price"
              current={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Change"
              sortKey="change"
              current={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Change %"
              sortKey="changePercent"
              current={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            {showTier && (
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                Tier
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {items.map((item, i) => {
            const up = item.changePercent >= 0;
            return (
              <tr
                key={item.symbol}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                  {i + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                  {item.symbol}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 tabular-nums dark:text-white">
                  ₹
                  {item.price.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td
                  className={`px-4 py-3 font-medium tabular-nums ${up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {up ? "+" : ""}
                  {item.change.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <PriceBadge value={item.changePercent} />
                </td>
                {showTier && (
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {item.tier ? tierLabel[item.tier] : "—"}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ViewAllPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") || "most-bought") as Section;

  // ── Raw data state ──
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Controls ──
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "gainers" | "losers">(
    (searchParams.get("filter") as any) || "all",
  );

  // Pocket-friendly specific
  const [pfTier, setPfTier] = useState<PFTier>("all");

  // Top-performers specific
  const [perfTf, setPerfTf] = useState<PerfTf>("1W");
  const [perfLoading, setPerfLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSection = useCallback(async () => {
    try {
      const resp = await fetch("/api/market/discovery");
      if (!resp.ok) {
        setError("Failed to load data. Please try again.");
        return;
      }

      const data = await resp.json();

      if (section === "most-bought") {
        setItems(mapQuotes(data.mostBought || []));
      } else if (section === "top-movers") {
        setItems([
          ...mapQuotes(data.topGainers || []),
          ...mapQuotes(data.topLosers || []),
        ]);
      } else if (section === "pocket-friendly") {
        const all = data.allStocks || [];
        setItems(mapQuotes(all));
      }
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  const fetchPerformers = useCallback(async (tf: PerfTf) => {
    setPerfLoading(true);
    setLoading(true);
    try {
      const resp = await fetch(`/api/market/performers?tf=${tf}`);
      if (!resp.ok) {
        setError("Failed to load performers.");
        return;
      }
      const data = await resp.json();
      const performers = (data.performers || []) as Array<{
        symbol: string;
        price: number;
        changePct: number;
      }>;
      setItems(
        performers.map((p) => ({
          symbol: p.symbol,
          price: p.price,
          change: 0,
          changePercent: p.changePct,
        })),
      );
    } catch {
      setError("Failed to load performers.");
    } finally {
      setPerfLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setLoading(true);
    setError(null);

    if (section === "top-performers") {
      void fetchPerformers(perfTf);
    } else {
      void fetchSection();
    }
  }, [section, fetchSection, fetchPerformers, perfTf]);

  useEffect(() => {
    if (section === "top-performers") {
      void fetchPerformers(perfTf);
    }
  }, [perfTf, section, fetchPerformers]);

  function mapQuotes(
    arr: Array<{
      symbol: string;
      regularMarketPrice: number;
      regularMarketChange: number;
      regularMarketChangePercent: number;
      regularMarketVolume?: number;
    }>,
    tier?: "under50" | "under100" | "under200",
  ): StockItem[] {
    return arr.map((q) => ({
      symbol: q.symbol,
      price: Number(q.regularMarketPrice || 0),
      change: Number(q.regularMarketChange || 0),
      changePercent: Number(q.regularMarketChangePercent || 0),
      volume: q.regularMarketVolume,
      tier,
    }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // ── Derived (filtered + sorted) list ──────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...items];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((s) => s.symbol.includes(q));
    }

    // Gainers / Losers filter
    if (filterType === "gainers") {
      list = list.filter((s) => s.changePercent >= 0);
    } else if (filterType === "losers") {
      list = list.filter((s) => s.changePercent < 0);
    }

    // Pocket-friendly tier filter (price-range based)
    if (section === "pocket-friendly" && pfTier !== "all") {
      const ceilings: Record<string, number> = {
        under50: 50,
        under100: 100,
        under200: 200,
      };
      const ceiling = ceilings[pfTier] ?? Infinity;
      list = list.filter((s) => s.price > 0 && s.price <= ceiling);
    }

    // Sort
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "symbol":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "price":
          av = a.price;
          bv = b.price;
          break;
        case "change":
          av = a.change;
          bv = b.change;
          break;
        case "changePercent":
          av = a.changePercent;
          bv = b.changePercent;
          break;
        case "volume":
          av = a.volume ?? 0;
          bv = b.volume ?? 0;
          break;
        default:
          av = a.changePercent;
          bv = b.changePercent;
      }
      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }
      return sortDir === "asc" ? av - (bv as number) : (bv as number) - av;
    });

    return list;
  }, [items, search, pfTier, sortKey, sortDir, section, filterType]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const gainers = displayed.filter((s) => s.changePercent >= 0).length;
    const losers = displayed.filter((s) => s.changePercent < 0).length;
    const avgChange = displayed.length
      ? displayed.reduce((s, i) => s + i.changePercent, 0) / displayed.length
      : 0;
    return { gainers, losers, avgChange };
  }, [displayed]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5 px-4 pb-2">
        <div className="flex-shrink-0 space-y-4 pt-6">
          {/* ── Header ── */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-transparent p-2 transition-all hover:border-gray-200 hover:bg-white dark:hover:border-gray-700 dark:hover:bg-gray-800"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <p className="text-xs text-gray-400">
                <Link href="/dashboard/market" className="hover:underline">
                  Market
                </Link>
                {" / "}
                {SECTION_LABELS[section]}
              </p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {SECTION_LABELS[section]}
              </h1>
            </div>
          </div>

          {/* ── Stats Bar ── */}
          {!loading && displayed.length > 0 && (
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {displayed.length}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-gray-500">Gainers</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.gainers}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs text-gray-500">Losers</span>
                <span className="text-sm font-semibold text-red-600">
                  {stats.losers}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-500">Avg Change</span>
                <span
                  className={`text-sm font-semibold ${stats.avgChange >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {stats.avgChange >= 0 ? "+" : ""}
                  {stats.avgChange.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* ── Filters Panel ── */}
          <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters & Sort
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative min-w-48 flex-1">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search symbol…"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-3 pl-8 text-sm placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Top Performers — timeframe selector */}
              {section === "top-performers" && (
                <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                  {(["1W", "1M", "1Y", "5Y"] as PerfTf[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setPerfTf(tf)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        perfTf === tf
                          ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}

              {/* Pocket Friendly — tier filter */}
              {section === "pocket-friendly" && (
                <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                  {(
                    [
                      { value: "all", label: "All" },
                      { value: "under50", label: "Under ₹50" },
                      { value: "under100", label: "Under ₹100" },
                      { value: "under200", label: "Under ₹200" },
                    ] as { value: PFTier; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPfTier(opt.value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                        pfTier === opt.value
                          ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick sort buttons */}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => {
                    setFilterType(filterType === "gainers" ? "all" : "gainers");
                    setSortKey("changePercent");
                    setSortDir("desc");
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    filterType === "gainers"
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  Top Gainers
                </button>
                <button
                  onClick={() => {
                    setFilterType(filterType === "losers" ? "all" : "losers");
                    setSortKey("price");
                    setSortDir("asc");
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    filterType === "losers"
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  Top Losers
                </button>
                {section === "pocket-friendly" && (
                  <button
                    onClick={() => {
                      setSortKey("price");
                      setSortDir("asc");
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      sortKey === "price" && sortDir === "asc"
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Cheapest
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading || perfLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-gray-100 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
            <span className="text-sm text-gray-400">
              Loading {SECTION_LABELS[section]}…
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-red-100 bg-white p-8 text-sm text-red-600 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-400">
            {error}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
            <StockTable
              items={displayed}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              showTier={section === "pocket-friendly"}
            />
          </div>
        )}

        {/* ── Footer count ── */}
        {!loading && !error && (
          <p className="flex-shrink-0 text-right text-xs text-gray-400">
            Showing {displayed.length} of {items.length} stocks
          </p>
        )}
      </div>
    </div>
  );
}
