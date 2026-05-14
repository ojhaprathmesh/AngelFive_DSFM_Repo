import { useCallback, useEffect, useState } from "react";

import type { ADFTestResult } from "@/lib/types/dsfm";

interface UseAdfTestReturn {
  adfResult: ADFTestResult | null;
  loadingADF: boolean;
}

export function useADFTest(
  symbol: string,
  timeframe: string,
): UseAdfTestReturn {
  const [adfResult, setAdfResult] = useState<ADFTestResult | null>(null);
  const [loadingADF, setLoadingADF] = useState(false);

  const fetchADFTest = useCallback(async () => {
    if (!symbol) return;
    setLoadingADF(true);
    try {
      const resp = await fetch(
        `/api/dsfm/adf-test?symbol=${symbol}&timeframe=${timeframe}`,
      );
      if (resp.ok) {
        const data: ADFTestResult = await resp.json();
        setAdfResult(data);
      } else {
        const errorData = await resp
          .json()
          .catch(() => ({ error: `HTTP ${resp.status}` }));
        const errorMsg =
          errorData.error || errorData.message || "Unknown error";
        if (!errorMsg.includes("SmartAPI") && !errorMsg.includes("JWT token")) {
          console.error("ADF test error:", errorMsg);
        }
      }
    } catch (e: unknown) {
      if (!(e as Error).message?.includes("Network")) {
        console.error("Failed to fetch ADF test:", e);
      }
    } finally {
      setLoadingADF(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    if (symbol) {
      void fetchADFTest();
    }
  }, [symbol, timeframe, fetchADFTest]);

  return { adfResult, loadingADF };
}
