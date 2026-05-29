/**
 * features/dsfm/index.ts
 *
 * Public API for the DSFM (Data Science in Financial Markets) feature.
 */

// Types
export type {
  ADFTestResult,
  ArimaResult,
  FinBERTResult,
  GarchResult,
  LSTMResult,
  ReturnsData,
  RuleSentimentResult,
} from "./types";

// Hooks
export { useADFTest } from "./hooks/useADFTest";
export { usePortfolioOptimization } from "./hooks/usePortfolioOptimization";
export { useReturnsData } from "./hooks/useReturnsData";
export { useSentimentAnalysis } from "./hooks/useSentimentAnalysis";
export { useTimeSeriesModels } from "./hooks/useTimeSeriesModels";
