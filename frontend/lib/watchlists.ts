/**
 * lib/watchlists.ts — backward-compatibility re-export shim
 *
 * The watchlist service has moved to:
 *   features/watchlists/services/watchlists.ts
 *
 * @deprecated Import from "@/features/watchlists/services/watchlists" instead.
 */
export {
  type WatchlistItem,
  watchlistService,
} from "@/features/watchlists/services/watchlists";
