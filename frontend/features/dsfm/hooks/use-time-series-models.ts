import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ArimaResult,
  GarchResult,
  LSTMResult,
} from "@/features/dsfm/types";

import { pollJobResult } from "../utils/polling";

interface UseTimeSeriesModelsReturn {
  arimaResult: ArimaResult | null;
  garchResult: GarchResult | null;
  lstmResult: LSTMResult | null;
  loadingARIMA: boolean;
  loadingGARCH: boolean;
  loadingLSTM: boolean;
  arimaChartRef: React.RefObject<HTMLDivElement | null>;
  garchVolChartRef: React.RefObject<HTMLDivElement | null>;
  lstmChartRef: React.RefObject<HTMLDivElement | null>;
  runArima: (
    symbol: string,
    timeframe: string,
    order: [number, number, number],
  ) => Promise<void>;
  runGarch: (
    symbol: string,
    timeframe: string,
    order: [number, number],
  ) => Promise<void>;
  runLstm: (symbol: string, lookback: number, steps: number) => Promise<void>;
}

export function useTimeSeriesModels(): UseTimeSeriesModelsReturn {
  const [arimaResult, setArimaResult] = useState<ArimaResult | null>(null);
  const [garchResult, setGarchResult] = useState<GarchResult | null>(null);
  const [lstmResult, setLstmResult] = useState<LSTMResult | null>(null);
  const [loadingARIMA, setLoadingARIMA] = useState(false);
  const [loadingGARCH, setLoadingGARCH] = useState(false);
  const [loadingLSTM, setLoadingLSTM] = useState(false);

  const arimaChartRef = useRef<HTMLDivElement>(null);
  const garchVolChartRef = useRef<HTMLDivElement>(null);
  const lstmChartRef = useRef<HTMLDivElement>(null);

  const renderForecastChart = useCallback(
    (
      ref: React.RefObject<HTMLDivElement | null>,
      forecast: number[],
      color: string,
    ) => {
      if (!ref.current || !forecast || forecast.length === 0) return;
      ref.current.innerHTML = "";
      if (ref.current.clientWidth === 0) {
        setTimeout(() => renderForecastChart(ref, forecast, color), 100);
        return;
      }
      import("lightweight-charts").then(
        ({ createChart, LineSeries, ColorType }) => {
          if (!ref.current) return;
          const chart = createChart(ref.current, {
            layout: {
              background: { type: ColorType.Solid, color: "transparent" },
              textColor: "#374151",
            },
            width: ref.current.clientWidth,
            height: 240,
            grid: {
              vertLines: { color: "#e5e7eb" },
              horzLines: { color: "#e5e7eb" },
            },
          });
          const baseTs = Math.floor(
            new Date("2000-01-01T00:00:00Z").getTime() / 1000,
          );
          chart.applyOptions({
            timeScale: {
              timeVisible: true,
              tickMarkFormatter: (t: any) => {
                const ts = typeof t === "number" ? t : 0;
                const idx = ts
                  ? Math.max(0, Math.round((ts - baseTs) / 86400))
                  : 0;
                return `Step ${idx}`;
              },
            },
            localization: { timeFormatter: () => "" },
          });
          const series = chart.addSeries(LineSeries, {
            color,
            lineWidth: 2,
            priceScaleId: "",
          });
          const chartData = forecast.map((v, i) => ({
            time: (baseTs + i * 86400) as import("lightweight-charts").Time,
            value: v,
          }));
          series.setData(chartData);
          chart.timeScale().fitContent();
        },
      );
    },
    [],
  );

  const renderGarchVolChart = useCallback(
    (vols: number[], forecast?: number[]) => {
      if (!garchVolChartRef.current || !vols || vols.length === 0) return;
      garchVolChartRef.current.innerHTML = "";
      if (garchVolChartRef.current.clientWidth === 0) {
        setTimeout(() => renderGarchVolChart(vols, forecast), 100);
        return;
      }
      import("lightweight-charts").then(
        ({ createChart, HistogramSeries, LineSeries, ColorType }) => {
          if (!garchVolChartRef.current) return;
          const chart = createChart(garchVolChartRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: "transparent" },
              textColor: "#374151",
            },
            width: garchVolChartRef.current.clientWidth,
            height: 240,
            grid: {
              vertLines: { color: "#e5e7eb" },
              horzLines: { color: "#e5e7eb" },
            },
          });
          const baseTs = Math.floor(
            new Date("2000-01-01T00:00:00Z").getTime() / 1000,
          );
          const histSeries = chart.addSeries(HistogramSeries, {
            color: "#8b5cf6",
            priceFormat: { type: "volume" },
            priceScaleId: "",
          });
          histSeries.setData(
            vols.map((v, i) => ({
              time: (baseTs + i * 86400) as import("lightweight-charts").Time,
              value: v,
            })),
          );
          if (forecast && forecast.length > 0) {
            const line = chart.addSeries(LineSeries, {
              color: "#ef4444",
              lineWidth: 2,
              priceScaleId: "",
            });
            line.setData(
              forecast.map((v, i) => ({
                time: (baseTs +
                  (vols.length + i) *
                    86400) as import("lightweight-charts").Time,
                value: v,
              })),
            );
          }
          chart.timeScale().fitContent();
        },
      );
    },
    [],
  );

  const runArima = useCallback(
    async (
      symbol: string,
      timeframe: string,
      order: [number, number, number],
    ) => {
      setLoadingARIMA(true);
      setArimaResult(null);
      try {
        const arimaTimeframe = timeframe === "1M" ? "1Y" : timeframe;
        const resp = await fetch("/api/dsfm/arima", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe: arimaTimeframe, order }),
        });
        if (resp.ok) {
          const { jobId, queueName } = await resp.json();
          const data = await pollJobResult<ArimaResult>(queueName, jobId);
          setArimaResult(data);
        } else {
          const errorData = await resp
            .json()
            .catch(() => ({ error: `HTTP ${resp.status}` }));
          alert(
            `ARIMA Model Error: ${errorData.message || errorData.error || "Unknown error"}`,
          );
        }
      } catch (e: unknown) {
        alert(`ARIMA Model Error: ${(e as Error).message || "Network error"}`);
      } finally {
        setLoadingARIMA(false);
      }
    },
    [],
  );

  const runGarch = useCallback(
    async (symbol: string, timeframe: string, order: [number, number]) => {
      setLoadingGARCH(true);
      setGarchResult(null);
      try {
        const garchTimeframe = timeframe === "1M" ? "1Y" : timeframe;
        const resp = await fetch("/api/dsfm/garch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe: garchTimeframe, order }),
        });
        if (resp.ok) {
          const { jobId, queueName } = await resp.json();
          const data = await pollJobResult<GarchResult>(queueName, jobId);
          setGarchResult(data);
        } else {
          const errorData = await resp
            .json()
            .catch(() => ({ error: `HTTP ${resp.status}` }));
          alert(
            `GARCH Model Error: ${errorData.message || errorData.error || "Unknown error"}`,
          );
        }
      } catch (e: unknown) {
        alert(`GARCH Model Error: ${(e as Error).message || "Network error"}`);
      } finally {
        setLoadingGARCH(false);
      }
    },
    [],
  );

  const runLstm = useCallback(
    async (symbol: string, lookback: number, steps: number) => {
      setLoadingLSTM(true);
      setLstmResult(null);
      try {
        const resp = await fetch("/api/dsfm/lstm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            timeframe: "1Y",
            lookback,
            forecastSteps: steps,
          }),
        });
        if (resp.ok) {
          const { jobId, queueName } = await resp.json();
          const data = await pollJobResult<LSTMResult>(queueName, jobId);
          setLstmResult(data);
        } else {
          const errorData = await resp
            .json()
            .catch(() => ({ error: `HTTP ${resp.status}` }));
          alert(
            `LSTM Error: ${errorData.error || errorData.message || "Unknown error"}`,
          );
        }
      } catch (e: unknown) {
        alert(`LSTM Error: ${(e as Error).message || "Network error"}`);
      } finally {
        setLoadingLSTM(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (arimaResult && Array.isArray(arimaResult.forecast)) {
      setTimeout(
        () =>
          renderForecastChart(arimaChartRef, arimaResult.forecast, "#3b82f6"),
        100,
      );
    }
  }, [arimaResult, renderForecastChart]);

  useEffect(() => {
    if (garchResult && Array.isArray(garchResult.conditionalVolatility)) {
      setTimeout(
        () =>
          renderGarchVolChart(
            garchResult.conditionalVolatility,
            garchResult.forecast,
          ),
        100,
      );
    }
  }, [garchResult, renderGarchVolChart]);

  useEffect(() => {
    if (lstmResult && Array.isArray(lstmResult.forecast)) {
      setTimeout(
        () => renderForecastChart(lstmChartRef, lstmResult.forecast, "#8b5cf6"),
        100,
      );
    }
  }, [lstmResult, renderForecastChart]);

  return {
    arimaResult,
    garchResult,
    lstmResult,
    loadingARIMA,
    loadingGARCH,
    loadingLSTM,
    arimaChartRef,
    garchVolChartRef,
    lstmChartRef,
    runArima,
    runGarch,
    runLstm,
  };
}
