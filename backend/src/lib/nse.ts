import { logger } from "./logger";

let cookieCache = "";
let cookieTime = 0;
const COOKIE_TTL_MS = 10 * 60 * 1000;

const HARDCODED_NIFTY_50 = [
  "ADANIENT",
  "ADANIPORTS",
  "APOLLOHOSP",
  "ASIANPAINT",
  "AXISBANK",
  "BAJAJ-AUTO",
  "BAJFINANCE",
  "BAJAJFINSV",
  "BPCL",
  "BHARTIARTL",
  "BRITANNIA",
  "CIPLA",
  "COALINDIA",
  "DIVISLAB",
  "DRREDDY",
  "EICHERMOT",
  "GRASIM",
  "HCLTECH",
  "HDFCBANK",
  "HDFCLIFE",
  "HEROMOTOCO",
  "HINDALCO",
  "HINDUNILVR",
  "ICICIBANK",
  "ITC",
  "INDUSINDBK",
  "INFY",
  "JSWSTEEL",
  "KOTAKBANK",
  "LT",
  "LTIM",
  "M&M",
  "MARUTI",
  "NTPC",
  "NESTLEIND",
  "ONGC",
  "POWERGRID",
  "RELIANCE",
  "SBILIFE",
  "SBIN",
  "SUNPHARMA",
  "TCS",
  "TATACONSUM",
  "TATAMOTORS",
  "TATASTEEL",
  "TECHM",
  "TITAN",
  "ULTRACEMCO",
  "SHRIRAMFIN",
  "WIPRO",
].map((symbol) => ({ symbol }));

async function fetchNifty50FromCSV(): Promise<{ symbol: string }[]> {
  try {
    const resp = await fetch(
      "https://www.niftyindices.com/IndexConstituent/ind_nifty50list.csv",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/csv,application/csv,text/plain,*/*",
        },
      },
    );

    if (!resp.ok) {
      throw new Error(`Failed to fetch CSV: ${resp.status} ${resp.statusText}`);
    }

    const csvData = await resp.text();
    const lines = csvData
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error("CSV data is empty or malformed");
    }

    // Find the symbol column index
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const symbolIdx = headers.findIndex((h) => h === "symbol");

    if (symbolIdx === -1) {
      throw new Error("Could not find 'Symbol' column in CSV headers");
    }

    const symbols = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .split(",")
        .map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length > symbolIdx && cols[symbolIdx]) {
        symbols.push({ symbol: cols[symbolIdx] });
      }
    }

    if (symbols.length > 0) {
      logger.info(
        `[NSE] Successfully fetched ${symbols.length} NIFTY 50 constituents from CSV`,
      );
      return symbols;
    }

    throw new Error("No symbols extracted from CSV");
  } catch (err: any) {
    logger.error(
      `[NSE] CSV parsing failed: ${err.message}. Falling back to hardcoded list.`,
    );
    return HARDCODED_NIFTY_50;
  }
}

function truncate(s: string, max = 300): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export async function getNSECookie(): Promise<string> {
  if (cookieCache && Date.now() - cookieTime < COOKIE_TTL_MS)
    return cookieCache;
  const resp = await fetch("https://www.nseindia.com/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");

    logger.warn(
      {
        status: resp.status,
        statusText: resp.statusText,
        body: truncate(text),
      },
      "[NSE] Cookie bootstrap failed",
    );
  }
  const cookieHeader = resp.headers.get("set-cookie") || "";
  if (!cookieHeader) {
    logger.warn("[NSE] No set-cookie received from bootstrap request");
  }
  cookieCache = cookieHeader;
  cookieTime = Date.now();
  return cookieHeader;
}

export async function fetchNSEIndex(
  indexName: string = "NIFTY 50",
): Promise<any[]> {
  // If fetching NIFTY 50, use the official CSV from niftyindices.com instead of the heavily blocked NSE API
  if (indexName === "NIFTY 50") {
    return fetchNifty50FromCSV();
  }

  const cookie = await getNSECookie();
  const url = `https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer:
        "https://www.nseindia.com/market-data/live-equity-market?symbol=NIFTY%2050",
      Cookie: cookie,
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");

    logger.warn(
      {
        status: resp.status,
        statusText: resp.statusText,
        index: indexName,
        body: truncate(text),
      },
      "[NSE] Index fetch failed, using fallback if available",
    );
    return indexName === "NIFTY 50" ? HARDCODED_NIFTY_50 : [];
  }
  const json: any = await resp.json();
  const data = json?.data || [];

  if (data.length === 0 && indexName === "NIFTY 50") {
    logger.warn("[NSE] Index fetch returned empty data, using fallback");
    return HARDCODED_NIFTY_50;
  }

  return data;
}
