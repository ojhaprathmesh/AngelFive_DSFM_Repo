/**
 * lib/types/dsfm.ts — backward-compatibility re-export shim
 *
 * DSFM types have moved to:
 *   features/dsfm/types/index.ts
 *
 * @deprecated Import from "@/features/dsfm/types" instead.
 */
export type {
  ADFTestResult,
  ArimaResult,
  FinBERTResult,
  GarchResult,
  LSTMResult,
  ReturnsData,
  RuleSentimentResult,
} from "@/features/dsfm/types";
