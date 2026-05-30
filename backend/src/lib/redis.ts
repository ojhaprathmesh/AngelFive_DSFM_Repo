/**
 * Redis Client
 *
 * Singleton ioredis client with:
 *  - Environment-driven config (REDIS_URL)
 *  - Exponential backoff retry strategy (capped at 10s)
 *  - Structured event logging (connect / disconnect / retry / error)
 *  - Health-status tracker for use in /health endpoint
 *  - Graceful degradation: errors are caught at the call-site — never crash the process
 *
 * Designed to also serve as the foundation for future BullMQ integration.
 */

import Redis from "ioredis";

import { ENV } from "../config/env";
import { logger } from "./logger";

// ── Health state ─────────────────────────────────────────────────────────────

export type RedisStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

let _status: RedisStatus = ENV.REDIS_URL ? "connecting" : "disabled";
let _latencyMs: number | null = null;

export function getRedisStatus(): {
  status: RedisStatus;
  latencyMs: number | null;
} {
  return { status: _status, latencyMs: _latencyMs };
}

export function isRedisEnabled(): boolean {
  return Boolean(ENV.REDIS_URL);
}

// ── Client singleton ──────────────────────────────────────────────────────────

let _client: Redis | null = null;

function createClient(): Redis {
  if (!ENV.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }
  const isTls = ENV.REDIS_URL.startsWith("rediss://");
  const rejectUnauthorizedRaw =
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED ?? "true";
  const rejectUnauthorized = rejectUnauthorizedRaw !== "false";

  const client = new Redis(ENV.REDIS_URL, {
    // Disable ioredis auto-reconnect; we control it via retryStrategy
    lazyConnect: false,

    // Exponential backoff: 100ms → 200ms → 400ms … capped at 10s
    // Returns null after 20 consecutive failures to stop retrying
    retryStrategy(times) {
      if (times > 20) {
        logger.error(
          "[Redis] ❌ Max reconnection attempts reached — giving up",
        );
        _status = "error";
        return null; // stop retrying
      }
      const delay = Math.min(100 * 2 ** (times - 1), 10_000);
      logger.warn(`[Redis] ⚠ Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },

    // Per-command timeout (ms) — prevents Redis ops from blocking request lifecycle
    // commandTimeout: 3_000,

    // Keep connection alive
    keepAlive: 10_000,

    // Managed Redis providers commonly require TLS (`rediss://`)
    ...(isTls
      ? {
          tls: { rejectUnauthorized },
        }
      : {}),

    // Disable verbose ioredis debug output
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
  });

  // ── Event handlers ─────────────────────────────────────────────────────────

  client.on("connect", () => {
    logger.info(
      `[Redis] ✅ Connected to ${ENV.REDIS_URL.replace(/\/\/.*@/, "//***@")}`,
    ); // mask credentials
    _status = "connecting"; // still handshaking
  });

  client.on("ready", async () => {
    logger.info("[Redis] ✅ Ready");
    _status = "connected";

    // Attempt to set eviction policy to noeviction (required by BullMQ)
    try {
      await client.config("SET", "maxmemory-policy", "noeviction");
      logger.info("[Redis] Eviction policy set to 'noeviction' successfully.");
    } catch (err: any) {
      logger.warn(
        `[Redis] Could not set maxmemory-policy to noeviction: ${err.message}. Ensure this is configured in your Redis provider dashboard.`,
      );
    }
  });

  client.on("close", () => {
    logger.warn("[Redis] ⚠ Connection closed");
    _status = "disconnected";
    _latencyMs = null;
  });

  client.on("reconnecting", () => {
    _status = "connecting";
  });

  client.on("error", (err: Error) => {
    // Only log the first occurrence of a repeated error to avoid log spam
    if (_status !== "error") {
      logger.error({ err }, "[Redis] ❌ Error");
    }
    _status = "error";
  });

  client.on("end", () => {
    logger.warn("[Redis] ⚠ Connection ended (no more reconnects)");
    _status = "disconnected";
  });

  return client;
}

export function getRedisClient(): Redis | null {
  if (!ENV.REDIS_URL) {
    _status = "disabled";
    _latencyMs = null;
    return null;
  }
  if (!_client) _client = createClient();
  return _client;
}

// ── Latency probe (non-blocking, best-effort) ─────────────────────────────────
// Called once on module load, then periodically in the background.
// Never throws — latency tracking is purely informational.

async function probeLatency(): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    if (_status !== "connected") return;
    const start = Date.now();
    await client.ping();
    _latencyMs = Date.now() - start;
  } catch {
    _latencyMs = null;
  }
}

// Probe every 30 seconds in the background
if (ENV.REDIS_URL) {
  setInterval(() => void probeLatency(), 30_000);
}

// Initialise eagerly so the connection is ready before the first request
getRedisClient();
