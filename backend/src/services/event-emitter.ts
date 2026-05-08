import { EventEmitter } from "events";

class AppEventEmitter extends EventEmitter {
  private static instance: AppEventEmitter;

  private constructor() {
    super();
  }

  public static getInstance(): AppEventEmitter {
    if (!AppEventEmitter.instance) {
      AppEventEmitter.instance = new AppEventEmitter();
    }
    return AppEventEmitter.instance;
  }
}

export const appEvents = AppEventEmitter.getInstance();

export enum AppEventType {
  // Auth Events
  AUTH_SIGNUP = "auth.signup",
  AUTH_LOGIN = "auth.login",

  // Watchlist Events
  WATCHLIST_CREATED = "watchlist.created",
  WATCHLIST_SYMBOL_ADDED = "watchlist.symbol_added",

  // Market Events
  MARKET_VOLATILITY_ALERT = "market.volatility.detected",

  // DSFM Events
  DSFM_OPTIMIZATION_COMPLETED = "dsfm.optimization.completed",
  DSFM_SENTIMENT_SPIKE = "dsfm.sentiment.spike",

  // System Events
  SYSTEM_ML_DEGRADED = "system.ml_service.degraded",
}

export interface AppEventPayload {
  userId: string;
  type: AppEventType;
  title: string;
  message: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, any>;
  action?: {
    type: "navigate" | "external";
    url: string;
  };
  dedupeKey?: string;
  expiresInHours?: number;
}
