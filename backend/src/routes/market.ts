import { Request, Response, Router } from "express";

import { ENV } from "../config/env";
import { logger } from "../lib/logger";
import { fetchNSEIndex, getNSECookie } from "../lib/nse";
import {
  fetchSmartApiCandles,
  fetchSmartApiQuotes,
  getSmartApiJwtToken,
  hasSmartApiCredentials,
  type SmartApiQuoteItem,
} from "../lib/smartapi";
import { verifyToken } from "../middleware/auth";
import { swrCache, TTL } from "../services/cache";
const router: Router = Router();

type Quote = {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume?: number;
};

interface SmartApiItem {
  tradingSymbol: string;
  percentChange?: number;
  symbolToken?: number;
  opnInterest?: number;
  netChangeOpnInterest?: number;
}

interface SmartApiGainersResponse {
  status: boolean;
  message?: string;
  errorCode?: string;
  data?: SmartApiItem[];
}

function formatDateForNSE(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function mapNSERowToQuote(r: any): Quote {
  return {
    symbol: String(r?.symbol || ""),
    regularMarketPrice: Number(r?.lastPrice || 0),
    regularMarketChange: Number(r?.change || 0),
    regularMarketChangePercent: Number(r?.pChange || 0),
    regularMarketVolume: Number(r?.totalTradedVolume || 0),
  };
}

/** When NSE blocks cloud IPs (403), SmartAPI basket covers discovery / performers / movers. */
const SMARTAPI_MARKET_BASKET: Record<string, string[]> = {
  NSE: [
    "2885", // RELIANCE
    "11536", // TCS
    "1333", // HDFCBANK
    "4963", // ICICIBANK
    "1594", // INFY
    "3045", // SBIN
    "3456", // TATAMOTORS
    "4717", // NTPC
    "14366", // IDEA
    "3351", // SUZLON
    "11915", // YESBANK
    "5097", // ZOMATO
    "10940", // DIVISLAB
    "13611", // IRCTC
    "11483", // LT
  ],
};

function mapSmartQuoteToQuote(q: SmartApiQuoteItem): Quote {
  return {
    symbol: q.symbol.replace("-EQ", ""),
    regularMarketPrice: q.price || 0,
    regularMarketChange: q.change || 0,
    regularMarketChangePercent: q.changePercent || 0,
    regularMarketVolume: q.volume ?? 0,
  };
}

async function fetchQuotesFromSmartApiBasket(): Promise<Quote[]> {
  try {
    const smartQuotes = await fetchSmartApiQuotes(SMARTAPI_MARKET_BASKET);
    if (smartQuotes.length === 0) return [];
    return smartQuotes.map(mapSmartQuoteToQuote);
  } catch (e) {
    logger.error({ err: e }, "[Market] SmartAPI basket quotes failed");
    return [];
  }
}

/** NSE index rows, or SmartAPI when NSE is blocked / lacks prices. */
async function fetchQuotesForMarketPanels(): Promise<Quote[]> {
  const rows = await fetchNSEIndex("NIFTY 50");
  const hasPrices = rows && rows.length > 0 && rows[0].lastPrice !== undefined;

  if (hasPrices) {
    return rows.map(mapNSERowToQuote);
  }

  logger.warn(
    "[Market] NSE index empty, blocked or lacks prices — using SmartAPI",
  );

  if (rows && rows.length > 0) {
    try {
      const exchangeTokens: Record<string, string[]> = { NSE: [] };
      const instruments = await loadInstrumentMaster();
      for (const r of rows) {
        const upper = String(r.symbol).toUpperCase();
        const match = instruments.find((item: any) => {
          const c1 = item.symbol?.toUpperCase();
          const c2 = item.tradingsymbol?.toUpperCase();
          return (
            c1 === upper ||
            c1 === `${upper}-EQ` ||
            c2 === upper ||
            c2 === `${upper}-EQ`
          );
        });
        if (match?.token) {
          exchangeTokens.NSE.push(String(match.token));
        }
      }
      if (exchangeTokens.NSE.length > 0) {
        const sq = await fetchSmartApiQuotes(exchangeTokens);
        if (sq.length > 0) {
          return sq.map(mapSmartQuoteToQuote);
        }
      }
    } catch (e) {
      logger.error(
        { err: e },
        "[Market] Failed to resolve SmartAPI quotes for NIFTY 50",
      );
    }
  }

  return fetchQuotesFromSmartApiBasket();
}

async function fetchDiscoveryData() {
  const rawQuotes = await fetchQuotesForMarketPanels();
  let source: "nse" | "smartapi" | "none" =
    rawQuotes.length > 0 ? "smartapi" : "none";

  // Mock volume if missing
  const quotes = rawQuotes.map((q) => ({
    ...q,
    regularMarketVolume:
      q.regularMarketVolume || Math.floor(Math.random() * 10_000_000),
  }));

  const mostBought = [...quotes]
    .sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0))
    .slice(0, 8);
  const topGainers = [...quotes]
    .sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent)
    .slice(0, 8);
  const topLosers = [...quotes]
    .sort((a, b) => a.regularMarketChangePercent - b.regularMarketChangePercent)
    .slice(0, 8);
  const under50 = quotes
    .filter((q) => q.regularMarketPrice > 0 && q.regularMarketPrice <= 50)
    .slice(0, 8);
  const under100 = quotes
    .filter((q) => q.regularMarketPrice > 0 && q.regularMarketPrice <= 100)
    .slice(0, 8);
  const under200 = quotes
    .filter((q) => q.regularMarketPrice > 0 && q.regularMarketPrice <= 200)
    .slice(0, 8);

  logger.info(
    { source, quoteCount: quotes.length },
    "[Discovery] Fetched discovery quotes",
  );

  return {
    meta: {
      source,
      fetchedAt: new Date().toISOString(),
    },
    mostBought,
    topGainers,
    topLosers,
    pocketFriendly: { under50, under100, under200 },
  };
}

router.get("/discovery", async (_req: Request, res: Response) => {
  try {
    const data = await swrCache.get(
      "market:discovery",
      fetchDiscoveryData,
      TTL.DISCOVERY,
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "failed_to_fetch_discovery" });
  }
});

async function fetchSmartApiHistoricalPrice(
  symbol: string,
  fromDate: string, // already DD-MM-YYYY from caller
  toDate: string,
): Promise<{ startPrice: number; endPrice: number } | null> {
  try {
    // The AngelOne instrument master is a very large JSON file and can cause OOM
    // on low-memory instances (e.g. 512MB). In production we skip this path and
    // rely on the estimated-performers fallback later in the pipeline.
    if (ENV.NODE_ENV === "production") return null;

    const instruments = await loadInstrumentMaster();
    const upper = symbol.toUpperCase();
    const match = instruments.find((item: any) => {
      if (item.exch_seg?.toUpperCase() !== "NSE") return false;
      const candidates = [
        item.symbol?.toUpperCase(),
        item.tradingsymbol?.toUpperCase(),
      ];
      return candidates.some((c) => c === upper || c === `${upper}-EQ`);
    });

    if (!match?.token) {
      logger.info(`[Historical] Token not found for ${symbol}`);
      return null;
    }

    // Convert DD-MM-YYYY → YYYY-MM-DD HH:MM for SmartAPI
    const toSmartDate = (ddmmyyyy: string, eod: boolean) => {
      const [dd, mm, yyyy] = ddmmyyyy.split("-");
      return `${yyyy}-${mm}-${dd} ${eod ? "23:59" : "00:00"}`;
    };

    const candles = await fetchSmartApiCandles(
      "NSE",
      String(match.token),
      "ONE_DAY",
      toSmartDate(fromDate, false),
      toSmartDate(toDate, true),
    );

    if (!candles || candles.length === 0) return null;

    const startPrice = candles[0][4]; // close of first candle
    const endPrice = candles[candles.length - 1][4]; // close of last candle

    if (startPrice <= 0 || endPrice <= 0) return null;

    return { startPrice, endPrice };
  } catch (e) {
    logger.error({ err: e }, `[Historical] Error fetching data for ${symbol}:`);
    return null;
  }
}

async function fetchPerformersData(
  tf: string,
): Promise<Array<{ symbol: string; price: number; changePct: number }>> {
  logger.info(`[Performers] Fetching fresh data for timeframe: ${tf}`);

  const quotes = await fetchQuotesForMarketPanels();
  if (quotes.length === 0) {
    logger.warn("[Performers] No quotes from NSE or SmartAPI basket");
    return [];
  }

  // Calculate date range based on timeframe
  const now = new Date();
  const from = new Date(now);
  if (tf === "1W") from.setDate(now.getDate() - 7);
  else if (tf === "1M") from.setMonth(now.getMonth() - 1);
  else if (tf === "1Y") from.setFullYear(now.getFullYear() - 1);
  else if (tf === "5Y") from.setFullYear(now.getFullYear() - 5);
  else from.setMonth(now.getMonth() - 1); // default to 1M

  const fromIso = from.toISOString().split("T")[0];
  const toIso = now.toISOString().split("T")[0];
  logger.info(`[Performers] Date range: ${fromIso} to ${toIso}`);

  // NSE historical API expects DD-MM-YYYY
  const fromDateStr = formatDateForNSE(from);
  const toDateStr = formatDateForNSE(now);

  // Prefer liquid names; relax volume when NSE is blocked (SmartAPI may omit volume)
  let validStocks = quotes
    .filter(
      (q) => q.regularMarketPrice > 0 && (q.regularMarketVolume || 0) > 10000,
    )
    .sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0))
    .slice(0, 30);

  if (validStocks.length < 4) {
    validStocks = [...quotes]
      .filter((q) => q.regularMarketPrice > 0)
      .sort(
        (a, b) =>
          Math.abs(b.regularMarketChangePercent) -
          Math.abs(a.regularMarketChangePercent),
      )
      .slice(0, 30);
  }

  logger.info(`[Performers] Processing ${validStocks.length} stocks`);

  // Fetch historical data and calculate performance
  const performers: Array<{
    symbol: string;
    price: number;
    changePct: number;
  }> = [];

  // Process stocks to get historical performance
  for (let i = 0; i < validStocks.length; i++) {
    if (performers.length >= 8) break;

    const stock = validStocks[i];
    const historical = await fetchSmartApiHistoricalPrice(
      stock.symbol,
      fromDateStr,
      toDateStr,
    );

    if (historical && historical.startPrice > 0) {
      const changePct =
        ((historical.endPrice - historical.startPrice) /
          historical.startPrice) *
        100;
      performers.push({
        symbol: stock.symbol,
        price: stock.regularMarketPrice,
        changePct: changePct,
      });
      logger.info(
        `[Performers] ${stock.symbol}: ${changePct.toFixed(2)}% (${historical.startPrice} -> ${historical.endPrice})`,
      );
    }
  }

  logger.info(
    `[Performers] Found ${performers.length} stocks with historical data`,
  );

  // If we don't have enough historical data, use a different approach
  if (performers.length < 8) {
    logger.info(
      `[Performers] Only found ${performers.length} stocks with historical data, using estimated performance`,
    );

    const remainingStocks = validStocks.filter(
      (q) =>
        !performers.find((p) => p.symbol === q.symbol) &&
        q.regularMarketPrice > 0,
    );

    const timeframeMultipliers: Record<string, number> = {
      "1W": 2.0,
      "1M": 5.0,
      "1Y": 25.0,
      "5Y": 80.0,
    };

    const multiplier = timeframeMultipliers[tf] || 1.0;

    const estimated = remainingStocks
      .map((q) => {
        const volumeScore = Math.log10((q.regularMarketVolume || 1) / 1000000);
        const changeScore = q.regularMarketChangePercent * multiplier;
        const combinedScore = changeScore + volumeScore * 0.5;

        return {
          symbol: q.symbol,
          price: q.regularMarketPrice,
          changePct: changeScore,
          score: combinedScore,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8 - performers.length)
      .map(({ symbol, price, changePct }) => ({
        symbol,
        price,
        changePct,
      }));

    performers.push(...estimated);
    logger.info(
      `[Performers] Added ${estimated.length} estimated performers for ${tf} using multiplier ${multiplier}x`,
    );
  }

  // Sort by change percentage and return top 8
  performers.sort((a, b) => b.changePct - a.changePct);
  const result = performers.slice(0, 8);
  logger.info(
    `[Performers] Returning ${result.length} performers for timeframe ${tf}`,
  );
  return result;
}

router.get(
  "/performers",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tf = String(req.query.tf || "1M");
      const cacheKey = `market:performers:${tf}`;
      const performers = await swrCache.get(
        cacheKey,
        () => fetchPerformersData(tf),
        TTL.PERFORMERS,
      );
      res.json({ performers });
    } catch (e) {
      logger.error({ err: e }, "[Performers] Error:");
      res.status(500).json({ error: "failed_to_fetch_performers" });
    }
  },
);

router.get("/quotes", async (req: Request, res: Response): Promise<void> => {
  try {
    const symbolsParam = String(req.query.symbols || "").trim();
    if (!symbolsParam) {
      res.json({ quotes: [] });
      return;
    }
    const wanted = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Cache the full quote panel (shared across callers), then filter client-side
    const cacheKey = "market:quotes:panel";
    const quotesAll: Quote[] = await swrCache.get(
      cacheKey,
      async () => {
        const start = Date.now();
        const raw = await fetchQuotesForMarketPanels();
        logger.info(
          { durationMs: Date.now() - start, count: raw.length },
          "[NSE] Quote panel fetched",
        );
        return raw.map((q) => ({ ...q, symbol: q.symbol.toUpperCase() }));
      },
      TTL.LIVE_PRICE,
    );

    const filtered = quotesAll
      .filter((q) => wanted.includes(q.symbol))
      .map((q) => ({
        symbol: q.symbol,
        price: q.regularMarketPrice,
        changePct: q.regularMarketChangePercent,
        exchange: "NSE",
      }));
    res.json({ quotes: filtered });
  } catch (e) {
    logger.error({ err: e }, "[NSE] Quotes route error");
    res.status(500).json({ error: "failed_to_fetch_quotes" });
  }
});

router.get(
  "/stock-overview",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const symbol = String(req.query.symbol || "")
        .trim()
        .toUpperCase();
      if (!symbol) {
        res.status(400).json({ error: "symbol_required" });
        return;
      }

      const cacheKey = `market:stock-overview:${symbol}`;
      const data = await swrCache.get(
        cacheKey,
        async () => {
          const start = Date.now();
          const cookie = await getNSECookie();
          const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
          const resp = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "application/json,text/plain,*/*",
              Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
              Cookie: cookie,
            },
          });

          const durationMs = Date.now() - start;

          if (!resp.ok) {
            logger.warn(
              { status: resp.status, symbol, durationMs },
              "[NSE] Stock overview fetch failed",
            );
            // Throw so the cache does NOT store a failed result
            throw new Error(`NSE returned ${resp.status} for ${symbol}`);
          }

          const json: any = await resp.json();
          const info = json?.info || {};
          const priceInfo = json?.priceInfo || {};
          const securityInfo = json?.securityInfo || {};
          const metadata = json?.metadata || {};
          const industryInfo = json?.industryInfo || {};

          const intraDay =
            priceInfo?.intraDayHighLow || priceInfo?.dayHighLow || {};
          const weekHighLow = priceInfo?.weekHighLow || {};
          const priceBand = securityInfo?.priceBand || {};

          logger.info({ symbol, durationMs }, "[NSE] Stock overview fetch OK");

          return {
            symbol: info?.symbol || symbol,
            companyName: info?.companyName || info?.longName || symbol,
            industry:
              info?.industry ||
              industryInfo?.industry ||
              metadata?.industry ||
              null,
            lastPrice: priceInfo?.lastPrice ?? null,
            change: priceInfo?.change ?? null,
            pChange: priceInfo?.pChange ?? null,
            open: priceInfo?.open ?? null,
            dayHigh: intraDay?.max ?? priceInfo?.dayHigh ?? null,
            dayLow: intraDay?.min ?? priceInfo?.dayLow ?? null,
            previousClose: priceInfo?.prevClose ?? priceInfo?.close ?? null,
            averagePrice: priceInfo?.vwap ?? null,
            totalTradedVolume: priceInfo?.totalTradedVolume ?? null,
            totalTradedValue: priceInfo?.totalTradedValue ?? null,
            bid: priceInfo?.bid ?? null,
            ask: priceInfo?.ask ?? null,
            upperCircuit: priceInfo?.upperCP ?? priceBand?.upper ?? null,
            lowerCircuit: priceInfo?.lowerCP ?? priceBand?.lower ?? null,
            weekHigh: weekHighLow?.max ?? null,
            weekHighDate: weekHighLow?.maxDate ?? null,
            weekLow: weekHighLow?.min ?? null,
            weekLowDate: weekHighLow?.minDate ?? null,
            faceValue: securityInfo?.faceValue ?? null,
            isin: securityInfo?.isin ?? null,
            marketCap:
              securityInfo?.issuedSize && priceInfo?.lastPrice
                ? Number(securityInfo.issuedSize) * Number(priceInfo.lastPrice)
                : (securityInfo?.marketCap ?? null),
            pe: metadata?.pdSymbolPe ?? metadata?.pe ?? null,
            pb: metadata?.pb ?? null,
            eps: metadata?.eps ?? null,
            dividendYield: metadata?.dividendYield ?? null,
            roe: metadata?.roe ?? null,
            beta: metadata?.beta ?? null,
            sectorPe: metadata?.pdSectorPe ?? null,
            lastUpdateTime: priceInfo?.lastUpdateTime ?? null,
          };
        },
        TTL.LIVE_PRICE,
      );

      res.json({ data });
    } catch (e) {
      logger.error({ err: e }, "[NSE] Stock overview route error");
      res.status(500).json({ error: "failed_to_fetch_stock_overview" });
    }
  },
);

// Get symbol token for a given symbol
router.get(
  "/symbol-token",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const symbol = String(req.query.symbol || "")
        .trim()
        .toUpperCase();
      const exchange = String(req.query.exchange || "NSE").toUpperCase();

      if (!symbol) {
        res.status(400).json({ error: "symbol parameter required" });
        return;
      }

      // Try to get token from instrument master
      const instruments = await loadInstrumentMaster();
      logger.info(
        `[symbol-token] Looking for ${symbol} on ${exchange}, total instruments: ${instruments.length}`,
      );

      // Try multiple matching strategies
      let match = instruments.find((item) => {
        if (item.exch_seg?.toUpperCase() !== exchange) return false;
        const candidates = [
          item.symbol?.toUpperCase(),
          item.name?.toUpperCase(),
          item.tradingsymbol?.toUpperCase(),
        ];
        const symbolUpper = symbol.toUpperCase();
        return candidates.some(
          (candidate) =>
            candidate === symbolUpper ||
            candidate === `${symbolUpper}-EQ` ||
            (candidate && candidate.startsWith(`${symbolUpper}-`)),
        );
      });

      // If not found, try without exchange filter (broader search)
      if (!match) {
        logger.info(
          `[symbol-token] Not found with exchange filter, trying without...`,
        );
        match = instruments.find((item) => {
          const candidates = [
            item.symbol?.toUpperCase(),
            item.name?.toUpperCase(),
            item.tradingsymbol?.toUpperCase(),
          ];
          const symbolUpper = symbol.toUpperCase();
          return candidates.some(
            (candidate) =>
              candidate === symbolUpper ||
              candidate === `${symbolUpper}-EQ` ||
              (candidate && candidate.startsWith(`${symbolUpper}-`)),
          );
        });
        if (match) {
          logger.info(
            `[symbol-token] Found without exchange filter, using exchange: ${match.exch_seg}`,
          );
        }
      }

      // If still not found, try partial matching
      if (!match) {
        logger.info(`[symbol-token] Trying partial match...`);
        const symbolUpper = symbol.toUpperCase();
        match = instruments.find((item) => {
          const candidates = [
            item.symbol?.toUpperCase(),
            item.name?.toUpperCase(),
            item.tradingsymbol?.toUpperCase(),
          ];
          return candidates.some(
            (candidate) =>
              candidate &&
              (candidate.includes(symbolUpper) ||
                symbolUpper.includes(candidate?.replace(/-EQ$/, "") || "")),
          );
        });
      }

      if (match && match.token) {
        res.json({
          exchange: match.exch_seg?.toUpperCase() || exchange,
          token: String(match.token),
          symbol: match.symbol || match.name || symbol,
        });
        return;
      }

      res.status(404).json({ error: "Token not found", symbol, exchange });
    } catch (e) {
      logger.error({ err: e }, "Error getting symbol token:");
      res.status(500).json({ error: "failed_to_get_symbol_token" });
    }
  },
);

async function loadInstrumentMaster(): Promise<any[]> {
  return swrCache.get(
    "market:instrument_master",
    async () => {
      try {
        const resp = await fetch(
          "https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json",
        );
        if (resp.ok) {
          const data = await resp.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (e) {
        logger.error({ err: e }, "Failed to load instrument master:");
      }
      return [];
    },
    TTL.INSTRUMENT_MASTER,
  );
}

// SmartAPI proxy endpoints - credentials stay on backend, frontend calls these
const INDEX_TOKEN_MAP: Record<string, { exchange: string; token: string }> = {
  "BSE:SENSEX": { exchange: "BSE", token: "99919000" },
  "NSE:NIFTY": { exchange: "NSE", token: "99926000" },
  "NSE:BANKNIFTY": { exchange: "NSE", token: "99926009" },
  "NSE:INDIAVIX": { exchange: "NSE", token: "99926017" },
  "NSE:FINNIFTY": { exchange: "NSE", token: "99926037" },
  "SBIN-EQ": { exchange: "NSE", token: "3045" },
};

router.post(
  "/smartapi/quote",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbols, exchangeTokens: bodyExchangeTokens } = req.body || {};
      let exchangeTokens: Record<string, string[]> = bodyExchangeTokens || {};

      if (
        Object.keys(exchangeTokens).length === 0 &&
        Array.isArray(symbols) &&
        symbols.length > 0
      ) {
        for (const symbol of symbols) {
          let info = INDEX_TOKEN_MAP[symbol];
          if (!info) {
            const instruments = await loadInstrumentMaster();
            const upper = symbol.toUpperCase();
            const match = instruments.find((item: any) => {
              const candidates = [
                item.symbol?.toUpperCase(),
                item.name?.toUpperCase(),
                item.tradingsymbol?.toUpperCase(),
              ];
              return candidates.some(
                (c) =>
                  c === upper ||
                  c === `${upper}-EQ` ||
                  (c && c.startsWith(`${upper}-`)),
              );
            });
            if (match?.token) {
              info = {
                exchange: match.exch_seg || "NSE",
                token: String(match.token),
              };
            }
          }
          if (info) {
            if (!exchangeTokens[info.exchange])
              exchangeTokens[info.exchange] = [];
            exchangeTokens[info.exchange].push(info.token);
          }
        }
      }

      if (Object.keys(exchangeTokens).length === 0) {
        res.json({
          quotes: [],
          source: null,
          error: "No tokens resolved",
        });
        return;
      }

      if (!hasSmartApiCredentials()) {
        res.json({
          quotes: [],
          source: null,
          error: "SmartAPI credentials not configured",
        });
        return;
      }

      // Build a stable cache key from the sorted exchange tokens
      const tokenSig = Object.keys(exchangeTokens)
        .sort()
        .map((ex) => `${ex}:${[...exchangeTokens[ex]].sort().join(",")}`)
        .join("|");
      const cacheKey = `market:smartapi-quote:${tokenSig}`;

      const quotes = await swrCache.get(
        cacheKey,
        () => fetchSmartApiQuotes(exchangeTokens),
        TTL.LIVE_PRICE,
      );

      res.json({ quotes, source: "smartapi" });
    } catch (e) {
      logger.error({ err: e }, "[SmartAPI] Quote route error");
      res.status(500).json({ error: "failed_to_fetch_quote" });
    }
  },
);

router.get(
  "/smartapi/candles",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const exchange = String(req.query.exchange || "NSE").toUpperCase();
      const symbolToken = String(req.query.token || "").trim();
      const interval = String(req.query.interval || "ONE_DAY");
      const fromDate = String(req.query.from || "");
      const toDate = String(req.query.to || "");

      if (!symbolToken || !fromDate || !toDate) {
        res.status(400).json({ error: "token, from, and to are required" });
        return;
      }

      if (!hasSmartApiCredentials()) {
        res.json({ candles: [], error: "SmartAPI credentials not configured" });
        return;
      }

      // Intraday intervals get a short TTL; historical get a longer one
      const intradayIntervals = [
        "ONE_MINUTE",
        "THREE_MINUTE",
        "FIVE_MINUTE",
        "TEN_MINUTE",
        "FIFTEEN_MINUTE",
        "THIRTY_MINUTE",
      ];
      const isIntraday = intradayIntervals.includes(interval.toUpperCase());
      const ttl = isIntraday ? TTL.CHART_INTRADAY : TTL.CHART_HISTORICAL;

      const cacheKey = `market:candles:${exchange}:${symbolToken}:${interval}:${fromDate}:${toDate}`;
      const candles = await swrCache.get(
        cacheKey,
        () =>
          fetchSmartApiCandles(
            exchange,
            symbolToken,
            interval,
            fromDate,
            toDate,
          ),
        ttl,
      );

      res.json({ candles });
    } catch (e) {
      logger.error({ err: e }, "[SmartAPI] Candles route error");
      res.status(500).json({ error: "failed_to_fetch_candles" });
    }
  },
);

// Yahoo Finance proxy endpoint to avoid CORS
router.get(
  "/yahoo-finance",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const symbol = String(req.query.symbol || "")
        .trim()
        .toUpperCase();
      const timeframe = String(req.query.timeframe || "1Y")
        .trim()
        .toUpperCase();
      if (!symbol) {
        res.status(400).json({ error: "Symbol is required" });
        return;
      }

      // Try multiple symbol formats
      const symbolFormats = [
        `${symbol}.NS`, // NSE
        `${symbol}.BO`, // BSE
        symbol, // Direct
      ];

      const timeframeConfig: Record<
        string,
        { lookbackSeconds: number; interval: string }
      > = {
        "1D": { lookbackSeconds: 7 * 24 * 60 * 60, interval: "5m" },
        "5D": { lookbackSeconds: 30 * 24 * 60 * 60, interval: "15m" },
        "1M": { lookbackSeconds: 180 * 24 * 60 * 60, interval: "1d" },
        "3M": { lookbackSeconds: 365 * 24 * 60 * 60, interval: "1d" },
        "6M": { lookbackSeconds: 2 * 365 * 24 * 60 * 60, interval: "1d" },
        "1Y": { lookbackSeconds: 5 * 365 * 24 * 60 * 60, interval: "1d" },
      };
      const config = timeframeConfig[timeframe] || timeframeConfig["1Y"];

      const to = Math.floor(Date.now() / 1000);
      const from = to - config.lookbackSeconds;

      for (const yahooSymbol of symbolFormats) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${from}&period2=${to}&interval=${config.interval}&events=history`;

          logger.info(`[Yahoo Finance] Trying: ${yahooSymbol}`);

          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            logger.warn(
              `[Yahoo Finance] Error for ${yahooSymbol}: ${response.status}`,
            );
            continue;
          }

          const data: any = await response.json();

          if (data.chart?.error) {
            logger.warn(
              `[Yahoo Finance] API error for ${yahooSymbol}:`,
              data.chart.error,
            );
            continue;
          }

          const result = data.chart?.result?.[0];

          if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
            logger.warn(`[Yahoo Finance] Invalid response for ${yahooSymbol}`);
            continue;
          }

          const timestamps = result.timestamp;
          const quote = result.indicators.quote[0];
          const opens = quote.open || [];
          const highs = quote.high || [];
          const lows = quote.low || [];
          const closes = quote.close || [];
          const volumes = quote.volume || [];

          const candles: Array<
            [string, number, number, number, number, number]
          > = [];

          for (let i = 0; i < timestamps.length; i++) {
            const timestamp = timestamps[i];
            const open = opens[i];
            const high = highs[i];
            const low = lows[i];
            const close = closes[i];
            const volume = volumes[i] || 0;

            if (open == null || high == null || low == null || close == null) {
              continue;
            }

            const date = new Date(timestamp * 1000);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

            candles.push([dateStr, open, high, low, close, volume]);
          }

          if (candles.length > 0) {
            logger.info(
              `[Yahoo Finance] ✅ Success for ${yahooSymbol}: ${candles.length} candles`,
            );
            res.json({
              candles,
              symbol: yahooSymbol,
              timeframe,
              interval: config.interval,
            });
            return;
          }
        } catch (e: any) {
          logger.warn(
            `[Yahoo Finance] Error trying ${yahooSymbol}:`,
            e.message,
          );
        }
      }

      logger.error(`[Yahoo Finance] ❌ All formats failed for: ${symbol}`);
      res.status(404).json({ error: `Unable to fetch data for ${symbol}` });
    } catch (e: any) {
      logger.error({ err: e }, "[Yahoo Finance] Error:");
      res
        .status(500)
        .json({ error: e.message || "Failed to fetch Yahoo Finance data" });
    }
  },
);

// Debug endpoint — see what's cached and how fresh it is
router.get("/cache-status", verifyToken, (_req: Request, res: Response) => {
  res.json({ entries: swrCache.status() });
});

// Clear cache — DELETE /api/market/cache?key=market:performers:1W  (single key)
//               DELETE /api/market/cache?prefix=market:candles:    (all candle keys)
//               DELETE /api/market/cache                           (everything)
router.delete("/cache", verifyToken, async (_req: Request, res: Response) => {
  const key = String(_req.query.key || "").trim();
  const prefix = String(_req.query.prefix || "").trim();

  if (key) {
    const deleted = await swrCache.delete(key);
    res.json({ cleared: deleted ? 1 : 0, key });
  } else {
    const count = await swrCache.clear(prefix || undefined);
    res.json({ cleared: count, prefix: prefix || "*" });
  }
});

router.post("/gainers-losers", async (req: Request, res: Response) => {
  try {
    const { datatype = "PercPriceGainers", expiryType = "NEAR" } =
      req.body || {};
    const url =
      "https://apiconnect.angelone.in/rest/secure/angelbroking/marketData/v1/gainersLosers";
    const apiKey = ENV.SMARTAPI_API_KEY;
    const jwt = await getSmartApiJwtToken();
    const localIp = ENV.SMARTAPI_LOCAL_IP || "127.0.0.1";
    const publicIp = ENV.SMARTAPI_PUBLIC_IP || "127.0.0.1";
    const mac = ENV.SMARTAPI_MAC_ADDRESS || "00:00:00:00:00:00";
    let smartData: SmartApiGainersResponse | null = null;
    if (apiKey && jwt) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-ClientLocalIP": localIp,
            "X-ClientPublicIP": publicIp,
            "X-MACAddress": mac,
            "X-PrivateKey": apiKey,
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ datatype, expiryType }),
        });
        if (resp.ok) {
          smartData = (await resp.json()) as SmartApiGainersResponse;
        }
      } catch {}
    }
    if (smartData && smartData.status && Array.isArray(smartData.data)) {
      const isLosers = datatype.toLowerCase().includes("losers");
      const items = smartData.data.map((item: any) => ({
        ...item,
        percentChange: isLosers
          ? -Math.abs(Number(item.percentChange || 0))
          : Number(item.percentChange || 0),
      }));
      return res.json({ source: "smartapi", items });
    }

    const rows = await fetchNSEIndex("NIFTY 50");
    let quotes: Quote[] = rows.map(mapNSERowToQuote);
    let source: "nse" | "nse-smartapi-fallback" | "none" = "nse";

    if (quotes.length === 0) {
      quotes = await fetchQuotesFromSmartApiBasket();
      source = quotes.length > 0 ? "nse-smartapi-fallback" : "none";
    }

    if (quotes.length === 0) {
      return res.json({ source: "none", gainers: [], losers: [] });
    }

    const gainers = [...quotes]
      .sort(
        (a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent,
      )
      .slice(0, 15);
    const losers = [...quotes]
      .sort(
        (a, b) => a.regularMarketChangePercent - b.regularMarketChangePercent,
      )
      .slice(0, 15);
    return res.json({ source, gainers, losers });
  } catch (e) {
    return res.status(500).json({ error: "failed_to_fetch_gainers_losers" });
  }
});

export default router;
