import { logger } from "./logger";

let cookieCache = "";
let cookieTime = 0;
const COOKIE_TTL_MS = 10 * 60 * 1000;

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
      "[NSE] Index fetch failed",
    );
    return [];
  }
  const json: any = await resp.json();
  return json?.data || [];
}
