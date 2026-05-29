/**
 * features/watchlists/index.ts
 *
 * Public API for the watchlists feature.
 */

// Service
export type { WatchlistItem } from "./services/watchlists";
export { watchlistService } from "./services/watchlists";

// Hooks
export { useWatchlistData } from "./hooks/use-watchlist-data";

// Components
export { StockCard } from "./components/stock-card";
export { WatchlistChart } from "./components/watchlist-chart";
export { WatchlistEditPanel } from "./components/watchlist-edit-panel";
export { WatchlistList } from "./components/watchlist-list";
export * from "./components/watchlist-modals";
export { StockOverviewPanel } from "./components/watchlist-stock-overview";
