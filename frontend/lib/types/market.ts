// Shared type definitions for market data features.

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
