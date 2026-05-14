// Shared type definitions for DSFM analytics features.

export interface ReturnsData {
  symbol: string;
  meanReturn: number;
  volatility: number;
  sharpeRatio: number;
  skewness: number;
  kurtosis: number;
  minReturn: number;
  maxReturn: number;
  logReturns: number[];
  prices: number[];
  timestamps?: string[];
  calculations?: {
    meanReturn: { formula: string; description: string; value: number };
    volatility: { formula: string; description: string; value: number };
    sharpeRatio: { formula: string; description: string; value: number };
    range: {
      formula: string;
      description: string;
      value: { min: number; max: number };
    };
  };
}

export interface ADFTestResult {
  testStatistic: number;
  pValue: number;
  criticalValues: { "1%": number; "5%": number; "10%": number };
  isStationary: boolean;
  interpretation: string;
  recommendation: string;
}

export interface ArimaResult {
  forecast: number[];
  aic?: number;
  bic?: number;
  [key: string]: any;
}

export interface GarchResult {
  conditionalVolatility: number[];
  forecast?: number[];
  alpha1?: number;
  beta1?: number;
  [key: string]: any;
}

export interface LSTMResult {
  forecast: number[];
  rmse?: number;
  r2_score?: number;
  training_loss?: number;
  [key: string]: any;
}

export interface FinBERTResult {
  label: string;
  score: number;
  [key: string]: unknown;
}

export interface RuleSentimentResult {
  sentiment: string;
  score?: number;
  [key: string]: unknown;
}
