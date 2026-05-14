import { useCallback, useState } from "react";

interface FinBERTResult {
  sentiment: string;
  score?: number;
  confidence?: number;
  [key: string]: unknown;
}

interface RuleSentimentResult {
  sentiment: string;
  bullish_signals?: number;
  bearish_signals?: number;
  confidence?: number;
  [key: string]: unknown;
}

interface UseSentimentAnalysisReturn {
  sentimentText: string;
  setSentimentText: (text: string) => void;
  finbertResult: FinBERTResult | null;
  ruleSentimentResult: RuleSentimentResult | null;
  loadingFinBERT: boolean;
  loadingRuleSentiment: boolean;
  runFinBERT: () => Promise<void>;
  runRuleSentiment: () => Promise<void>;
}

export function useSentimentAnalysis(): UseSentimentAnalysisReturn {
  const [sentimentText, setSentimentText] = useState<string>("");
  const [finbertResult, setFinbertResult] = useState<FinBERTResult | null>(
    null,
  );
  const [ruleSentimentResult, setRuleSentimentResult] =
    useState<RuleSentimentResult | null>(null);
  const [loadingFinBERT, setLoadingFinBERT] = useState(false);
  const [loadingRuleSentiment, setLoadingRuleSentiment] = useState(false);

  const runFinBERT = useCallback(async () => {
    if (!sentimentText.trim()) {
      alert("Please enter some text for analysis");
      return;
    }
    setLoadingFinBERT(true);
    setFinbertResult(null);
    try {
      const resp = await fetch("/api/dsfm/sentiment/finbert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentimentText }),
      });
      if (resp.ok) {
        const data: FinBERTResult = await resp.json();
        setFinbertResult(data);
      } else {
        const errorData = await resp
          .json()
          .catch(() => ({ error: `HTTP ${resp.status}` }));
        alert(
          `FinBERT Error: ${errorData.error || errorData.message || "Unknown error"}`,
        );
      }
    } catch (e: unknown) {
      alert(`FinBERT Error: ${(e as Error).message || "Network error"}`);
    } finally {
      setLoadingFinBERT(false);
    }
  }, [sentimentText]);

  const runRuleSentiment = useCallback(async () => {
    if (!sentimentText.trim()) {
      alert("Please enter some text for analysis");
      return;
    }
    setLoadingRuleSentiment(true);
    setRuleSentimentResult(null);
    try {
      const resp = await fetch("/api/dsfm/sentiment/rule-based", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentimentText }),
      });
      if (resp.ok) {
        const data: RuleSentimentResult = await resp.json();
        setRuleSentimentResult(data);
      } else {
        const errorData = await resp
          .json()
          .catch(() => ({ error: `HTTP ${resp.status}` }));
        alert(
          `Rule-based Error: ${errorData.error || errorData.message || "Unknown error"}`,
        );
      }
    } catch (e: unknown) {
      alert(`Rule-based Error: ${(e as Error).message || "Network error"}`);
    } finally {
      setLoadingRuleSentiment(false);
    }
  }, [sentimentText]);

  return {
    sentimentText,
    setSentimentText,
    finbertResult,
    ruleSentimentResult,
    loadingFinBERT,
    loadingRuleSentiment,
    runFinBERT,
    runRuleSentiment,
  };
}
