// features/market/types/index.ts
// Feature-owned type definitions for market data.

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface StockItem {
  symbol: string;
  exchange: string;
  price: number;
  changePct: number;
  change?: number;
}
