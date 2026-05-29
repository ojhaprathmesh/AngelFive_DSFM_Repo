/**
 * features/market/index.ts
 *
 * Public API for the market feature.
 * Consumers should import from this barrel rather than drilling into subdirectories.
 */

// Service
export type { MarketData } from "./services/market-data";
export { marketDataService } from "./services/market-data";

// Types
export type { MarketIndex, StockItem } from "./types";

// Components
export { default as MarketDiscovery } from "./components/market-discovery";
export { default as MarketOverview } from "./components/market-overview";
