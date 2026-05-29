import { useCallback, useState } from "react";

interface MPTResult {
  symbols?: string[];
  optimal_portfolio?: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: number[];
  };
  efficient_frontier?: Array<{ volatility: number; expected_return: number }>;
  [key: string]: unknown;
}

interface BLResult {
  symbols?: string[];
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  optimal_weights: number[];
  [key: string]: unknown;
}

interface UsePortfolioOptimizationReturn {
  mptResult: MPTResult | null;
  blResult: BLResult | null;
  loadingMPT: boolean;
  loadingBL: boolean;
  runMPT: (symbols: string[], timeframe: string) => Promise<void>;
  runBL: (symbols: string[], timeframe: string) => Promise<void>;
}

export function usePortfolioOptimization(): UsePortfolioOptimizationReturn {
  const [mptResult, setMptResult] = useState<MPTResult | null>(null);
  const [blResult, setBlResult] = useState<BLResult | null>(null);
  const [loadingMPT, setLoadingMPT] = useState(false);
  const [loadingBL, setLoadingBL] = useState(false);

  const runMPT = useCallback(async (symbols: string[], timeframe: string) => {
    if (symbols.length < 2) {
      alert("Please select at least 2 stocks for portfolio optimization");
      return;
    }
    setLoadingMPT(true);
    setMptResult(null);
    try {
      const resp = await fetch("/api/dsfm/mpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, timeframe, riskFreeRate: 0.06 }),
      });
      if (resp.ok) {
        const data: MPTResult = await resp.json();
        setMptResult(data);
      } else {
        const errorData = await resp
          .json()
          .catch(() => ({ error: `HTTP ${resp.status}` }));
        alert(
          `MPT Error: ${errorData.error || errorData.message || "Unknown error"}`,
        );
      }
    } catch (e: unknown) {
      alert(`MPT Error: ${(e as Error).message || "Network error"}`);
    } finally {
      setLoadingMPT(false);
    }
  }, []);

  const runBL = useCallback(async (symbols: string[], timeframe: string) => {
    if (symbols.length < 2) {
      alert("Please select at least 2 stocks for portfolio optimization");
      return;
    }
    setLoadingBL(true);
    setBlResult(null);
    try {
      const resp = await fetch("/api/dsfm/black-litterman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols,
          timeframe,
          riskAversion: 3.0,
          tau: 0.05,
        }),
      });
      if (resp.ok) {
        const data: BLResult = await resp.json();
        setBlResult(data);
      } else {
        const errorData = await resp
          .json()
          .catch(() => ({ error: `HTTP ${resp.status}` }));
        alert(
          `Black-Litterman Error: ${errorData.error || errorData.message || "Unknown error"}`,
        );
      }
    } catch (e: unknown) {
      alert(
        `Black-Litterman Error: ${(e as Error).message || "Network error"}`,
      );
    } finally {
      setLoadingBL(false);
    }
  }, []);

  return { mptResult, blResult, loadingMPT, loadingBL, runMPT, runBL };
}
