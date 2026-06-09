/**
 * instrument-master.ts
 *
 * Redis-backed instrument token resolution.
 *
 * Architecture:
 *  - On server start, `syncInstrumentMasterIfStale()` runs in the background.
 *  - It streams the ~180MB Angel One ScripMaster JSON and pipelines HSET
 *    commands into Redis hash keys, one per exchange (e.g. `instruments:NSE`).
 *  - Multiple key variants are stored per instrument (e.g. "IDEA" and "IDEA-EQ")
 *    so lookups work regardless of how callers format the symbol.
 *  - `resolveSymbolsToTokens()` now does O(1) Redis HMGET lookups instead of
 *    scanning through a potentially-corrupt 180MB file.
 *  - If Redis is unavailable, an error is logged and empty results returned
 *    (graceful degradation — no process crash).
 */

import { logger } from "../lib/logger";
import { getRedisClient } from "../lib/redis";

const MASTER_URL =
  "https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json";

/** Redis key storing ISO timestamp of the last successful sync. */
const SYNC_TS_KEY = "instruments:lastSynced";

/** Redis hash key prefix — one hash per exchange, e.g. `instruments:NSE`. */
const HASH_PREFIX = "instruments";

/** Re-sync if the data in Redis is older than 12 hours. */
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Batch size for Redis pipeline HSET commands. */
const PIPELINE_BATCH_SIZE = 500;

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

export interface ResolvedToken {
  exchange: string;
  token: string;
  symbol: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Checks if the instrument data in Redis is fresh (< 12 hours old).
 */
async function isCacheFresh(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) return false;
    const ts = await redis.get(SYNC_TS_KEY);
    if (!ts) return false;
    return Date.now() - new Date(ts).getTime() < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Downloads the ScripMaster JSON from Angel One and populates Redis hashes.
 * Uses Node.js streaming + Redis pipeline batching to handle the ~180MB file
 * without loading it entirely into memory.
 *
 * Redis structure:
 *   HSET instruments:NSE  IDEA      '{"token":"14366","exchange":"NSE","symbol":"IDEA-EQ"}'
 *   HSET instruments:NSE  IDEA-EQ   '{"token":"14366","exchange":"NSE","symbol":"IDEA-EQ"}'
 */
async function populateInstrumentsInRedis(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) throw new Error("Redis client is not available");

  logger.info(`[InstrumentMaster] Downloading ScripMaster from ${MASTER_URL}`);
  const response = await fetch(MASTER_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to download instrument master: ${response.status} ${response.statusText}`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body reader is undefined");

  let buffer = "";
  let totalCount = 0;

  // We accumulate pipeline entries and flush in batches.
  // Each entry is [exchangeKey, symbolKey, jsonValue]
  type PipelineEntry = [string, string, string];
  let batch: PipelineEntry[] = [];

  const flushBatch = async (entries: PipelineEntry[]) => {
    if (entries.length === 0) return;
    const pipeline = redis.pipeline();
    for (const [hashKey, field, value] of entries) {
      pipeline.hset(hashKey, field, value);
    }
    await pipeline.exec();
  };

  const processInstrument = async (inst: ScripInstrument) => {
    if (!inst.token || !inst.exch_seg) return;

    const exchange = inst.exch_seg.toUpperCase();
    const hashKey = `${HASH_PREFIX}:${exchange}`;
    const payload: ResolvedToken = {
      token: String(inst.token),
      exchange,
      symbol: inst.symbol || inst.name || "",
    };
    const json = JSON.stringify(payload);

    // Store under multiple key variants so lookups work regardless of format
    const keys = new Set<string>();
    if (inst.symbol) keys.add(inst.symbol.toUpperCase());
    if (inst.tradingsymbol) keys.add(inst.tradingsymbol.toUpperCase());
    if (inst.name) keys.add(inst.name.toUpperCase());

    // Also add the base name without suffix (e.g. "IDEA" from "IDEA-EQ")
    for (const k of [...keys]) {
      const base = k.replace(/-EQ$|-BE$|-SM$|-IV$/, "");
      if (base !== k) keys.add(base);
    }

    for (const key of keys) {
      batch.push([hashKey, key, json]);
      totalCount++;
    }

    if (batch.length >= PIPELINE_BATCH_SIZE) {
      await flushBatch(batch);
      batch = [];
    }
  };

  // Stream + parse: extract flat `{...}` objects from the JSON array
  const objectRegex = /\{[^{}]+\}/g;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);

      let match: RegExpExecArray | null;
      let lastIndex = 0;

      while ((match = objectRegex.exec(buffer)) !== null) {
        try {
          const inst = JSON.parse(match[0]) as ScripInstrument;
          await processInstrument(inst);
        } catch {
          // Partial chunk — will be re-parsed on next iteration
        }
        lastIndex = objectRegex.lastIndex;
      }

      // Keep only the unparsed tail for the next chunk
      buffer = buffer.slice(lastIndex);
      objectRegex.lastIndex = 0;
    }

    // Flush remaining batch
    await flushBatch(batch);

    // Mark sync timestamp
    await redis.set(SYNC_TS_KEY, new Date().toISOString());

    logger.info(
      `[InstrumentMaster] ✅ Synced ${totalCount} instrument keys to Redis`,
    );
    return totalCount;
  } finally {
    reader.releaseLock();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Call this at server startup (fire-and-forget).
 * Checks if the Redis cache is fresh; if not, downloads and re-populates it.
 */
export async function syncInstrumentMasterIfStale(): Promise<void> {
  try {
    const fresh = await isCacheFresh();
    if (fresh) {
      logger.debug("[InstrumentMaster] Redis cache is fresh — skipping sync.");
      return;
    }
    logger.info(
      "[InstrumentMaster] Redis cache is stale or missing — starting sync...",
    );
    await populateInstrumentsInRedis();
  } catch (err: any) {
    logger.error(
      { err },
      "[InstrumentMaster] ❌ Failed to sync instrument master to Redis",
    );
    // Non-fatal: the server continues to run; lookups will return empty results
    // until the next successful sync attempt.
  }
}

/**
 * Resolves a batch of symbols to their exchange and token info using Redis.
 * Falls back to empty results if Redis is unavailable.
 *
 * @param symbols  List of symbol strings (e.g. ["IDEA", "TATASTEEL"])
 * @param exchange Exchange to look up (default: "NSE")
 */
export async function resolveSymbolsToTokens(
  symbols: string[],
  exchange = "NSE",
): Promise<Record<string, ResolvedToken>> {
  const results: Record<string, ResolvedToken> = {};

  if (symbols.length === 0) return results;

  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn(
        "[InstrumentMaster] Redis unavailable — cannot resolve tokens",
      );
      return results;
    }

    const exchangeUpper = exchange.toUpperCase();
    const hashKey = `${HASH_PREFIX}:${exchangeUpper}`;
    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Build a list of candidate keys (both "IDEA" and "IDEA-EQ")
    const candidateKeys: string[] = [];
    for (const s of upperSymbols) {
      candidateKeys.push(s);
      if (!s.endsWith("-EQ")) candidateKeys.push(`${s}-EQ`);
    }

    // Single HMGET call for all candidate keys — O(n) where n = 2 * symbols.length
    const values = await redis.hmget(hashKey, ...candidateKeys);

    // Map results back to the original symbol names
    for (let i = 0; i < candidateKeys.length; i++) {
      const val = values[i];
      if (!val) continue;

      const candidateKey = candidateKeys[i];
      // Determine which original symbol this key belongs to
      const originalSymbol =
        upperSymbols.find(
          (s) => s === candidateKey || `${s}-EQ` === candidateKey,
        ) || candidateKey;

      if (!results[originalSymbol]) {
        try {
          const parsed = JSON.parse(val) as ResolvedToken;
          results[originalSymbol] = parsed;
        } catch {
          // Malformed stored value — skip
        }
      }
    }
  } catch (err: any) {
    logger.error(
      { err },
      "[InstrumentMaster] Error resolving symbols from Redis",
    );
  }

  return results;
}

/**
 * Resolves a single symbol to its exchange and token info.
 */
export async function resolveSymbolToToken(
  symbol: string,
  exchange = "NSE",
): Promise<ResolvedToken | null> {
  const res = await resolveSymbolsToTokens([symbol], exchange);
  return res[symbol.toUpperCase()] || null;
}
