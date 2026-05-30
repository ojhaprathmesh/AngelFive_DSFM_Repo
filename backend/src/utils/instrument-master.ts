import { createReadStream, createWriteStream, existsSync } from "fs";
import { stat } from "fs/promises";
import path from "path";

import { logger } from "../lib/logger";

const MASTER_URL =
  "https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json";
const CACHE_PATH = path.resolve(__dirname, "../../instruments.json");
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface ScripInstrument {
  token: string;
  symbol: string;
  name: string;
  expiry?: string;
  strike?: string;
  lotsize?: string;
  instrumenttype?: string;
  exch_seg: string;
  tick_size?: string;
  tradingsymbol?: string;
}

/**
 * Ensures the instrument master is downloaded and cached locally.
 */
export async function ensureInstrumentMasterCached(): Promise<string> {
  try {
    let isFresh = false;
    if (existsSync(CACHE_PATH)) {
      const s = await stat(CACHE_PATH);
      if (Date.now() - s.mtimeMs < CACHE_MAX_AGE_MS && s.size > 100_000) {
        isFresh = true;
      }
    }

    if (isFresh) {
      logger.debug("[InstrumentMaster] Cache is fresh.");
      return CACHE_PATH;
    }

    logger.info(
      `[InstrumentMaster] Cache stale or missing. Downloading from ${MASTER_URL}...`,
    );
    const response = await fetch(MASTER_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to download instrument master: ${response.status} ${response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body reader is undefined");
    }

    const writer = createWriteStream(CACHE_PATH);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(Buffer.from(value));
      }
    } finally {
      writer.end();
    }

    logger.info(
      `[InstrumentMaster] Successfully cached master to ${CACHE_PATH}`,
    );
    return CACHE_PATH;
  } catch (err: any) {
    logger.error(
      { err },
      "[InstrumentMaster] Failed to cache scrip master, using fallback if file exists",
    );
    if (existsSync(CACHE_PATH)) {
      return CACHE_PATH;
    }
    throw err;
  }
}

/**
 * Searches the instrument master file in a streaming fashion using 64KB chunks.
 * Passes parsed flat JSON objects one by one to the onMatch callback.
 */
export async function searchInstrumentsStream(
  onMatch: (inst: ScripInstrument) => boolean,
): Promise<void> {
  const filePath = await ensureInstrumentMasterCached();

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, {
      encoding: "utf8",
      highWaterMark: 64 * 1024,
    });
    let buffer = "";

    stream.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();

      const regex = /\{[^{}]+\}/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(buffer)) !== null) {
        try {
          const inst = JSON.parse(match[0]) as ScripInstrument;
          const shouldStop = onMatch(inst);
          if (shouldStop) {
            stream.destroy();
            resolve();
            return;
          }
        } catch (e) {
          // Ignore parse errors from partial reads
        }
        lastIndex = regex.lastIndex;
      }

      buffer = buffer.slice(lastIndex);
    });

    stream.on("end", () => {
      resolve();
    });

    stream.on("error", (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Resolves a batch of symbols to their exchange and token info.
 * Stops streaming immediately when all symbols have been resolved.
 */
export async function resolveSymbolsToTokens(
  symbols: string[],
  exchange = "NSE",
): Promise<
  Record<string, { exchange: string; token: string; symbol: string }>
> {
  const results: Record<
    string,
    { exchange: string; token: string; symbol: string }
  > = {};
  const uppercaseSymbols = symbols.map((s) => s.toUpperCase());
  const remainingSymbols = new Set(uppercaseSymbols);
  const exchangeUpper = exchange.toUpperCase();

  await searchInstrumentsStream((inst) => {
    if (inst.exch_seg?.toUpperCase() !== exchangeUpper) return false;

    const symbolUpper = inst.symbol?.toUpperCase();
    const tradingSymbolUpper = inst.tradingsymbol?.toUpperCase();
    const nameUpper = inst.name?.toUpperCase();

    for (const s of remainingSymbols) {
      const matches =
        symbolUpper === s ||
        symbolUpper === `${s}-EQ` ||
        tradingSymbolUpper === s ||
        tradingSymbolUpper === `${s}-EQ` ||
        nameUpper === s ||
        nameUpper === `${s}-EQ`;

      if (matches && inst.token) {
        results[s] = {
          exchange: exchangeUpper,
          token: String(inst.token),
          symbol: inst.symbol || inst.name || s,
        };
        remainingSymbols.delete(s);
        break;
      }
    }

    return remainingSymbols.size === 0;
  });

  return results;
}

/**
 * Resolves a single symbol to its exchange and token info.
 */
export async function resolveSymbolToToken(
  symbol: string,
  exchange = "NSE",
): Promise<{ exchange: string; token: string; symbol: string } | null> {
  const res = await resolveSymbolsToTokens([symbol], exchange);
  return res[symbol.toUpperCase()] || null;
}
