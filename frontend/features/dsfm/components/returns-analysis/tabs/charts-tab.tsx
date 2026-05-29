"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChartsTabProps {
  priceChartRef: React.RefObject<HTMLDivElement | null>;
  returnsChartRef: React.RefObject<HTMLDivElement | null>;
}

export function ChartsTab({ priceChartRef, returnsChartRef }: ChartsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stock Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={priceChartRef} className="h-75 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Log Returns Chart</CardTitle>
          <CardDescription>Daily log returns: ln(Pₜ / Pₜ₋₁)</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={returnsChartRef} className="h-75 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
