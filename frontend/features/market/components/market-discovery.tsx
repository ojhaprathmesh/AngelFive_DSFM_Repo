"use client";

import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type MarketData } from "@/features/market/services/market-data";

interface PerformerItem {
  symbol: string;
  ltp: number;
  changePct: number;
}

interface QuoteLike {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

interface DiscoveryResponse {
  mostBought: QuoteLike[];
  topGainers: QuoteLike[];
  topLosers: QuoteLike[];
  allStocks: QuoteLike[];
}

interface PerformersResponse {
  performers: Array<{ symbol: string; price: number; changePct: number }>;
}

function PriceBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <Badge
      className={
        positive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </Badge>
  );
}

function SkeletonCard() {
  return (
    <div className="h-24 animate-pulse rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-4 h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center justify-between py-3">
      <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-1/5 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-1/6 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

export default function MarketDiscovery() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostBought, setMostBought] = useState<MarketData[]>([]);
  const [gainers, setGainers] = useState<MarketData[]>([]);
  const [losers, setLosers] = useState<MarketData[]>([]);
  const [allStocks, setAllStocks] = useState<MarketData[]>([]);
  const [pfCeiling, setPfCeiling] = useState<number>(200);
  const [pfCustom, setPfCustom] = useState<string>("");
  const [pfIsCustom, setPfIsCustom] = useState<boolean>(false);

  const [tf, setTf] = useState<"1W" | "1M" | "1Y" | "5Y">("1W");
  const [performers, setPerformers] = useState<PerformerItem[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`/api/market/discovery`, {
          cache: "no-store",
        });
        if (!resp.ok) {
          setError("Failed to load discovery data");
          setLoading(false);
          return;
        }
        const lists: DiscoveryResponse = await resp.json();
        const map = (q: QuoteLike): MarketData => ({
          symbol: q.symbol,
          price: Number(q.regularMarketPrice || 0),
          change: Number(q.regularMarketChange || 0),
          changePercent: Number(q.regularMarketChangePercent || 0),
          lastUpdated: new Date().toISOString(),
        });
        setMostBought((lists.mostBought || []).map(map));
        const gs = (lists.topGainers || []).map(map);
        const ls = (lists.topLosers || []).map(map);
        // Only update gainers/losers if the new data has actual prices (non-zero)
        // This prevents a slower fetch with zero prices from clobbering good data
        const hasGoodPrices = (arr: MarketData[]) =>
          arr.length > 0 && arr[0].price > 0;
        setGainers((prev) =>
          hasGoodPrices(gs) || !hasGoodPrices(prev) ? gs : prev,
        );
        setLosers((prev) =>
          hasGoodPrices(ls) || !hasGoodPrices(prev) ? ls : prev,
        );
        setAllStocks((lists.allStocks || []).map(map));
        setLoading(false);
      } catch {
        setError("Failed to load discovery data");
        setLoading(false);
      }
    };
    void load();
    const i = setInterval(() => void load(), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const loadMovers = async () => {
      try {
        const resp = await fetch(`/api/market/gainers-losers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datatype: "PercPriceGainers",
            expiryType: "NEAR",
          }),
        });
        if (resp.ok) {
          const jl: {
            source: string;
            items?: Array<{ tradingSymbol: string; percentChange?: number }>;
            gainers?: QuoteLike[];
            losers?: QuoteLike[];
          } = await resp.json();

          if (
            (jl.source === "nse" || jl.source === "nse-smartapi-fallback") &&
            Array.isArray(jl.gainers) &&
            Array.isArray(jl.losers)
          ) {
            const mapQ = (q: QuoteLike): MarketData => ({
              symbol: q.symbol,
              price: Number(q.regularMarketPrice || 0),
              change: Number(q.regularMarketChange || 0),
              changePercent: Number(q.regularMarketChangePercent || 0),
              lastUpdated: new Date().toISOString(),
            });
            const newGainers = jl.gainers!.slice(0, 8).map(mapQ);
            const newLosers = jl.losers!.slice(0, 8).map(mapQ);
            const hasGoodPrices = (arr: MarketData[]) =>
              arr.length > 0 && arr[0].price > 0;
            setGainers((prev) =>
              hasGoodPrices(newGainers) || !hasGoodPrices(prev)
                ? newGainers
                : prev,
            );
            setLosers((prev) =>
              hasGoodPrices(newLosers) || !hasGoodPrices(prev)
                ? newLosers
                : prev,
            );
            return;
          }

          if (jl.source === "smartapi" && Array.isArray(jl.items)) {
            const mapItem = (x: {
              tradingSymbol: string;
              percentChange?: number;
            }): MarketData => ({
              symbol: x.tradingSymbol,
              price: 0,
              change: 0,
              changePercent: Number(x.percentChange || 0),
              lastUpdated: new Date().toISOString(),
            });
            const arr = jl.items.map(mapItem);

            // Only use SmartAPI's sparse data (which lacks prices) if we don't already have rich data from discovery
            setGainers((prev) =>
              prev.length > 0 && prev[0].price > 0 ? prev : arr.slice(0, 8),
            );

            // losers call:
            const resp2 = await fetch(`/api/market/gainers-losers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                datatype: "PercPriceLosers",
                expiryType: "NEAR",
              }),
            });
            if (resp2.ok) {
              const jl2: {
                source: string;
                items?: Array<{
                  tradingSymbol: string;
                  percentChange?: number;
                }>;
              } = await resp2.json();
              if (jl2.source === "smartapi" && Array.isArray(jl2.items)) {
                const losersArr = jl2.items
                  .map((x) => ({
                    symbol: x.tradingSymbol,
                    price: 0,
                    change: 0,
                    changePercent: -Math.abs(Number(x.percentChange || 0)), // ← negate for losers
                    lastUpdated: new Date().toISOString(),
                  }))
                  .slice(0, 8);

                setLosers((prev) =>
                  prev.length > 0 && prev[0].price > 0 ? prev : losersArr,
                );
              }
            }
          }
        }
      } catch {}
    };
    void loadMovers();
  }, []);

  useEffect(() => {
    const loadPerf = async () => {
      try {
        setLoadingPerformers(true);
        console.log(`[Frontend] Loading performers for timeframe: ${tf}`);
        const resp = await fetch(`/api/market/performers?tf=${tf}`, {
          cache: "no-store",
        });
        if (resp.ok) {
          const data: PerformersResponse = await resp.json();
          const mapped = (data.performers || []).map((p) => ({
            symbol: p.symbol,
            ltp: p.price,
            changePct: p.changePct,
          }));
          console.log(
            `[Frontend] Loaded ${mapped.length} performers for ${tf}`,
          );
          setPerformers(mapped);
        } else {
          console.error(`[Frontend] Failed to load performers: ${resp.status}`);
          setPerformers([]);
        }
      } catch (e) {
        console.error("[Frontend] Failed to load performers:", e);
        setPerformers([]);
      } finally {
        setLoadingPerformers(false);
      }
    };
    void loadPerf();
  }, [tf]);

  const header = (title: string, section?: string) => (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      {section && (
        <Link
          href={`/dashboard/market/view-all?section=${encodeURIComponent(section)}`}
          className="text-xs text-blue-600 hover:underline"
        >
          VIEW ALL
        </Link>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {header("Most Bought Stocks", "most-bought")}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {loading && mostBought.length === 0 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          )}
          {mostBought.slice(0, 5).map((s, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="text-sm font-semibold">{s.symbol}</div>
              <div className="text-xs text-gray-500">LTP</div>
              <div className="flex items-center gap-2">
                <span className="text-sm">₹{s.price.toFixed(2)}</span>
                <PriceBadge value={s.changePercent} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {header("Top Movers and Sectorwise Movements")}
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <Badge className="bg-green-100 text-green-800">Gainers</Badge>
              <Link
                href="/dashboard/market/view-all?section=top-movers&filter=gainers"
                className="text-xs text-blue-600 hover:underline"
              >
                VIEW ALL
              </Link>
            </div>
            <div className="divide-y">
              {loading && gainers.length === 0 && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              )}
              {!loading && gainers.length === 0 && (
                <div className="py-2 text-xs text-gray-500">
                  No data available right now.
                </div>
              )}
              {gainers.slice(0, 5).map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{g.symbol}</div>
                  </div>
                  <div className="w-36 text-right text-sm font-medium text-gray-900 dark:text-white">
                    ₹{g.price.toFixed(2)}
                  </div>
                  <div className="flex w-24 items-center justify-end gap-1 text-right text-green-700">
                    <TrendingUp className="h-3 w-3" /> {g.change.toFixed(2)}
                  </div>
                  <div className="w-24 text-right">
                    <PriceBadge value={g.changePercent} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <Badge className="bg-red-100 text-red-800">Losers</Badge>
              <Link
                href="/dashboard/market/view-all?section=top-movers&filter=losers"
                className="text-xs text-blue-600 hover:underline"
              >
                VIEW ALL
              </Link>
            </div>
            <div className="divide-y">
              {loading && losers.length === 0 && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              )}
              {!loading && losers.length === 0 && (
                <div className="py-2 text-xs text-gray-500">
                  No data available right now.
                </div>
              )}
              {losers.slice(0, 5).map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{g.symbol}</div>
                  </div>
                  <div className="w-36 text-right">₹{g.price.toFixed(2)}</div>
                  <div className="flex w-24 items-center justify-end gap-1 text-right text-red-700">
                    <TrendingDown className="h-3 w-3" /> {g.change.toFixed(2)}
                  </div>
                  <div className="w-24 text-right">
                    <PriceBadge value={g.changePercent} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {header("Top Performers", "top-performers")}
        <div className="mb-3 flex items-center justify-between">
          <Tabs
            value={tf}
            onValueChange={(v: string) => setTf(v as "1W" | "1M" | "1Y" | "5Y")}
          >
            <TabsList>
              <TabsTrigger value="1W">1 Week</TabsTrigger>
              <TabsTrigger value="1M">1 Month</TabsTrigger>
              <TabsTrigger value="1Y">1 Year</TabsTrigger>
              <TabsTrigger value="5Y">5 Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loadingPerformers ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : performers.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-gray-500">
              No performers data available for {tf}
            </div>
          ) : (
            performers.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="text-sm font-semibold">{p.symbol}</div>
                <div className="text-xs text-gray-500">₹{p.ltp.toFixed(2)}</div>
                <div className="mt-2">
                  <PriceBadge value={p.changePct} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {header("Pocket Friendly Stocks", "pocket-friendly")}
        {/* ── Filter row ── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {([50, 100, 200, 500] as const).map((val) => (
            <button
              key={val}
              onClick={() => {
                setPfCeiling(val);
                setPfIsCustom(false);
                setPfCustom("");
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                !pfIsCustom && pfCeiling === val
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              ₹{val}
            </button>
          ))}
          <button
            onClick={() => setPfIsCustom(true)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              pfIsCustom
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            Custom
          </button>
          {pfIsCustom && (
            <div className="ml-1 flex items-center gap-1.5">
              <span className="text-xs text-gray-400">₹</span>
              <input
                autoFocus
                type="number"
                min={1}
                max={100000}
                placeholder="e.g. 750"
                value={pfCustom}
                onChange={(e) => {
                  setPfCustom(e.target.value);
                  if (e.target.value) setPfCeiling(Number(e.target.value));
                }}
                className="w-20 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-blue-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {
              allStocks.filter((s) => s.price > 0 && s.price <= pfCeiling)
                .length
            }{" "}
            stocks
          </span>
        </div>
        {/* ── Stock grid ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {loading && allStocks.length === 0 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          )}
          {!loading &&
            allStocks.filter((s) => s.price > 0 && s.price <= pfCeiling)
              .length === 0 && (
              <div className="col-span-full py-2 text-xs text-gray-400">
                No stocks found under ₹{pfCeiling}.
              </div>
            )}
          {allStocks
            .filter((s) => s.price > 0 && s.price <= pfCeiling)
            .slice(0, 5)
            .map((s, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="text-sm font-semibold">{s.symbol}</div>
                <div className="mb-1 text-xs text-gray-400">LTP</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">₹{s.price.toFixed(2)}</span>
                  <PriceBadge value={s.changePercent} />
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Join our Community
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost">YouTube</Button>
          <Button variant="ghost">Twitter</Button>
          <Button variant="ghost">Telegram</Button>
          <Button variant="ghost">Instagram</Button>
        </div>
      </div>
    </div>
  );
}
