/**
 * features/watchlists/index.ts
 *
 * Public API for the watchlists feature.
 */

// Service
export type { WatchlistItem } from "./services/watchlists";
export { watchlistService } from "./services/watchlists";

// Hooks
export { useWatchlistData } from "./hooks/useWatchlistData";

// Components
export { StockCard } from "./components/StockCard";
export { WatchlistEditPanel } from "./components/WatchlistEditPanel";
export { WatchlistList } from "./components/WatchlistList";
export {
  AddStockModal,
  CreateWatchlistModal,
} from "./components/WatchlistModals";
