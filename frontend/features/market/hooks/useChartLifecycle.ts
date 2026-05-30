import {
  ChartOptions,
  ColorType,
  createChart,
  DeepPartial,
  IChartApi,
} from "lightweight-charts";
import { MutableRefObject, useEffect, useRef } from "react";

interface UseChartLifecycleProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  options?: DeepPartial<ChartOptions>;
}

export function useChartLifecycle({
  containerRef,
  options,
}: UseChartLifecycleProps) {
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Force minimum dimensions if container is too small
    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;

    if (width === 0 || width < 100) width = 800;
    if (height === 0 || height < 100) height = 400;

    const defaultOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#374151",
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "#e5e7eb" },
      },
      width,
      height,
    };

    const chart = createChart(containerRef.current, {
      ...defaultOptions,
      ...options,
    });
    chartRef.current = chart;

    // Remove TradingView attribution logo
    const removeBranding = () => {
      if (!containerRef.current) return;
      const logoAnchor = containerRef.current.querySelector("a#tv-attr-logo");
      if (logoAnchor) logoAnchor.remove();
      const styleTags = containerRef.current.querySelectorAll("style");
      styleTags.forEach((styleEl) => {
        if (
          styleEl.textContent &&
          styleEl.textContent.includes("tv-attr-logo")
        ) {
          styleEl.remove();
        }
      });
    };
    removeBranding();
    setTimeout(removeBranding, 0);
    setTimeout(removeBranding, 250);

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Optional: Use ResizeObserver for more robust resizing
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [containerRef, options]);

  return { chartRef };
}
