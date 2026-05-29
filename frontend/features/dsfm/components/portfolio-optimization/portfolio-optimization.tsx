"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { usePortfolioOptimization } from "../../hooks/use-portfolio-optimization";
import { NIFTY_50_STOCKS, SENSEX_STOCKS } from "./constants";
import { EfficientFrontierChart } from "./efficient-frontier-chart";

export function PortfolioOptimization() {
  const [selectedIndex, setSelectedIndex] = useState<string>("nifty50");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<string>("1Y");
  const [activeTab, setActiveTab] = useState<string>("results");

  const { mptResult, blResult, loadingMPT, loadingBL, runMPT, runBL } =
    usePortfolioOptimization();

  const currentStocks =
    selectedIndex === "nifty50" ? NIFTY_50_STOCKS : SENSEX_STOCKS;

  useEffect(() => {
    setSelectedSymbols([]);
  }, [selectedIndex]);

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Optimization</CardTitle>
          <CardDescription>
            Modern Portfolio Theory (MPT) and Black-Litterman model for optimal
            asset allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Index + Timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Select Index
              </label>
              <Select
                value={selectedIndex}
                onValueChange={(value) => setSelectedIndex(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select index" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nifty50">Nifty 50</SelectItem>
                  <SelectItem value="sensex">Sensex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Timeframe
              </label>
              <Select
                value={timeframe}
                onValueChange={(value) => setTimeframe(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3M">3 Months</SelectItem>
                  <SelectItem value="1Y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                Select Stocks from{" "}
                {selectedIndex === "nifty50" ? "Nifty 50" : "Sensex"} (
                {selectedSymbols.length} selected)
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSymbols([...currentStocks])}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSymbols([])}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border p-4">
              <div className="flex flex-wrap gap-2">
                {currentStocks.map((sym) => (
                  <Button
                    key={`${selectedIndex}-${sym}`}
                    variant={
                      selectedSymbols.includes(sym) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => toggleSymbol(sym)}
                    className="w-24 justify-center border text-xs"
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selected:{" "}
              {selectedSymbols.length > 0
                ? selectedSymbols.slice(0, 10).join(", ") +
                  (selectedSymbols.length > 10
                    ? ` ... (+${selectedSymbols.length - 10} more)`
                    : "")
                : "None"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => void runMPT(selectedSymbols, timeframe)}
              disabled={loadingMPT || selectedSymbols.length < 2}
            >
              {loadingMPT ? "Optimizing..." : "MPT Optimization"}
            </Button>
            <Button
              onClick={() => void runBL(selectedSymbols, timeframe)}
              disabled={loadingBL || selectedSymbols.length < 2}
              variant="outline"
            >
              {loadingBL ? "Optimizing..." : "Black-Litterman"}
            </Button>
          </div>

          {/* Results */}
          {loadingMPT || loadingBL ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="results">Portfolio Results</TabsTrigger>
                <TabsTrigger value="frontier">Efficient Frontier</TabsTrigger>
              </TabsList>

              <TabsContent value="results" className="space-y-4">
                {mptResult && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                    <CardHeader>
                      <CardTitle className="text-blue-800 dark:text-blue-200">
                        MPT Optimal Portfolio
                      </CardTitle>
                      <CardDescription className="text-blue-700 dark:text-blue-300">
                        <strong>Modern Portfolio Theory (MPT):</strong>{" "}
                        Optimizes portfolio weights to maximize return for a
                        given level of risk. The efficient frontier shows all
                        optimal portfolios - higher risk portfolios offer higher
                        expected returns. The optimal portfolio is the one with
                        the highest Sharpe ratio (risk-adjusted return).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Expected Return:
                          </span>
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {(
                              (mptResult.optimal_portfolio?.expected_return ??
                                0) * 100
                            ).toFixed(2)}
                            %
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Volatility:
                          </span>
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {(
                              (mptResult.optimal_portfolio?.volatility ?? 0) *
                              100
                            ).toFixed(2)}
                            %
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Sharpe Ratio:
                          </span>
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {mptResult.optimal_portfolio?.sharpe_ratio?.toFixed(
                              3,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold">
                          Optimal Weights:
                        </p>
                        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
                          {mptResult.symbols?.map(
                            (sym: string, idx: number) => {
                              const weight =
                                (mptResult.optimal_portfolio?.weights[idx] ??
                                  0) * 100;
                              if (weight < 0.1) return null;
                              return (
                                <div
                                  key={sym}
                                  className="flex items-center justify-between rounded bg-white p-2 text-xs dark:bg-gray-800"
                                >
                                  <span className="font-medium">{sym}:</span>
                                  <Badge
                                    variant="secondary"
                                    className="font-mono"
                                  >
                                    {weight.toFixed(1)}%
                                  </Badge>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {blResult && (
                  <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                    <CardHeader>
                      <CardTitle className="text-purple-800 dark:text-purple-200">
                        Black-Litterman Optimal Portfolio
                      </CardTitle>
                      <CardDescription className="text-purple-700 dark:text-purple-300">
                        <strong>Black-Litterman Model:</strong> Combines market
                        equilibrium returns (from market cap weights) with
                        investor views. More stable than pure MPT, reduces
                        extreme weights, and allows incorporating expert
                        opinions. Uses Bayesian approach to blend prior beliefs
                        (market) with new information (views).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Expected Return:
                          </span>
                          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                            {(blResult.expected_return * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Volatility:
                          </span>
                          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                            {(blResult.volatility * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Sharpe Ratio:
                          </span>
                          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                            {blResult.sharpe_ratio?.toFixed(3)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold">
                          Optimal Weights:
                        </p>
                        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
                          {blResult.symbols?.map((sym: string, idx: number) => {
                            const weight =
                              (blResult.optimal_weights[idx] ?? 0) * 100;
                            if (weight < 0.1) return null;
                            return (
                              <div
                                key={sym}
                                className="flex items-center justify-between rounded bg-white p-2 text-xs dark:bg-gray-800"
                              >
                                <span className="font-medium">{sym}:</span>
                                <Badge
                                  variant="secondary"
                                  className="font-mono"
                                >
                                  {weight.toFixed(1)}%
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="frontier" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Efficient Frontier</CardTitle>
                    <CardDescription>
                      Risk-Return trade-off curve showing optimal portfolios at
                      different risk levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mptResult?.efficient_frontier &&
                    mptResult.efficient_frontier.length > 0 ? (
                      <EfficientFrontierChart
                        frontier={mptResult.efficient_frontier}
                        optimal={mptResult.optimal_portfolio}
                        shouldRender={activeTab === "frontier"}
                      />
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        {mptResult
                          ? "No efficient frontier data available"
                          : "Run MPT Optimization first to see the Efficient Frontier"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
