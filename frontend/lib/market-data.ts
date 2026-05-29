/**
 * lib/market-data.ts — backward-compatibility re-export shim
 *
 * The market data service has moved to:
 *   features/market/services/market-data.ts
 *
 * This shim allows existing consumers that haven't been updated yet
 * to continue working without breaking changes.
 *
 * @deprecated Import from "@/features/market/services/market-data" instead.
 */
export {
  type MarketData,
  marketDataService,
} from "@/features/market/services/market-data";
