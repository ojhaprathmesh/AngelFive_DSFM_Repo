"use client";

import {
  Activity,
  BarChart3,
  ChevronDown,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useADFTest } from "../../hooks/use-adf-test";
import { useReturnsData } from "../../hooks/use-returns-data";
import { useSentimentAnalysis } from "../../hooks/use-sentiment-analysis";
import { useTimeSeriesModels } from "../../hooks/use-time-series-models";
import { ChartsTab } from "./tabs/charts-tab";
import { LSTMTab } from "./tabs/lstm-tab";
import { ModelsTab } from "./tabs/models-tab";
import { SentimentTab } from "./tabs/sentiment-tab";
import { StationarityTab } from "./tabs/stationarity-tab";

const POPULAR_STOCKS = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
  "HINDUNILVR",
  "SBIN",
  "BHARTIARTL",
  "ITC",
  "KOTAKBANK",
  "LT",
  "AXISBANK",
  "ASIANPAINT",
  "MARUTI",
  "TITAN",
  "ULTRACEMCO",
  "NESTLEIND",
  "BAJFINANCE",
  "WIPRO",
  "ONGC",
  "TATAMOTORS",
  "NTPC",
  "POWERGRID",
  "INDUSINDBK",
  "TECHM",
  "HCLTECH",
  "SUNPHARMA",
  "COALINDIA",
];

export function ReturnsAnalysis() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("1M");
  const selectedSymbolRef = useRef<string>("");
  selectedSymbolRef.current = selectedSymbol;

  useEffect(() => {
    if (!selectedSymbolRef.current) {
      setSelectedSymbol(POPULAR_STOCKS[0]);
    }
  }, []);

  const {
    data: returnsData,
    loading,
    error,
    priceChartRef,
    returnsChartRef,
  } = useReturnsData(selectedSymbol, timeframe);

  const { adfResult, loadingADF } = useADFTest(selectedSymbol, timeframe);

  const {
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
  } = useTimeSeriesModels();

  const {
    sentimentText,
    setSentimentText,
    finbertResult,
    ruleSentimentResult,
    loadingFinBERT,
    loadingRuleSentiment,
    runFinBERT,
    runRuleSentiment,
  } = useSentimentAnalysis();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Returns Analysis &amp; Time-Series Modeling</CardTitle>
          <CardDescription>
            Analyze log returns, distribution properties, statistical measures,
            and time-series models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Symbol + Timeframe selectors */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">
                Select Stock
              </label>
              <Select
                value={selectedSymbol}
                onValueChange={(value) => setSelectedSymbol(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stock" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_STOCKS.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
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
                  <SelectGroup>
                    <SelectLabel>Short term</SelectLabel>
                    <SelectItem value="1W">1 Week</SelectItem>
                    <SelectItem value="1M">1 Month</SelectItem>
                    <SelectItem value="3M">3 Months</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Long term</SelectLabel>
                    <SelectItem value="6M">6 Months</SelectItem>
                    <SelectItem value="1Y">1 Year</SelectItem>
                    <SelectItem value="2Y">2 Years</SelectItem>
                    <SelectItem value="3Y">3 Years</SelectItem>
                    <SelectItem value="5Y">5 Years</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : returnsData ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Mean Return
                    </CardTitle>
                    <CardAction>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(returnsData.meanReturn * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                  {returnsData.calculations && (
                    <CardFooter className="text-xs text-gray-500">
                      {returnsData.calculations.meanReturn.description}
                    </CardFooter>
                  )}
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Volatility (σ)
                    </CardTitle>
                    <CardAction>
                      <Activity className="h-8 w-8 text-blue-500" />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(returnsData.volatility * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                  {returnsData.calculations && (
                    <CardFooter className="text-xs text-gray-500">
                      {returnsData.calculations.volatility.description}
                    </CardFooter>
                  )}
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Sharpe Ratio
                    </CardTitle>
                    <CardAction>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {returnsData.sharpeRatio.toFixed(2)}
                    </p>
                  </CardContent>
                  {returnsData.calculations && (
                    <CardFooter className="text-xs text-gray-500">
                      {returnsData.calculations.sharpeRatio.description}
                    </CardFooter>
                  )}
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Range
                    </CardTitle>
                    <CardAction>
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold">
                      {(returnsData.minReturn * 100).toFixed(2)}% to{" "}
                      {(returnsData.maxReturn * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                  {returnsData.calculations && (
                    <CardFooter className="text-xs text-gray-500">
                      {returnsData.calculations.range.description}
                    </CardFooter>
                  )}
                </Card>
              </div>

              {/* Metrics explainer accordion */}
              {returnsData.calculations && (
                <details className="group bg-card text-card-foreground rounded-lg border shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center justify-between p-6 text-lg font-semibold transition-colors">
                    How These Metrics Are Calculated
                    <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-3 border-t p-6 pt-0">
                    <div className="space-y-2 pt-4">
                      {[
                        {
                          title: "Mean Return (μ)",
                          formula: "μ = (1/n) × Σ(log returns)",
                          desc: "Average of all daily log returns. Shows expected daily return.",
                        },
                        {
                          title: "Volatility (σ)",
                          formula: "σ = √(Σ(returns - μ)² / n)",
                          desc: "Standard deviation of returns. Measures risk/uncertainty. Higher = more volatile.",
                        },
                        {
                          title: "Sharpe Ratio",
                          formula: "Sharpe = (μ_annual - r_f) / σ_annual",
                          desc: "Risk-adjusted return. Compares excess return to volatility. >1 is good, >2 is excellent.",
                        },
                        {
                          title: "Range",
                          formula: "[min(returns), max(returns)]",
                          desc: "Minimum and maximum daily returns observed in the period.",
                        },
                      ].map(({ title, formula, desc }) => (
                        <div key={title} className="flex items-start gap-2">
                          <Info className="mt-0.5 h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-semibold">{title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Formula: {formula}
                            </p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {/* Tabs */}
              <Tabs defaultValue="charts" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="stationarity">ADF Test</TabsTrigger>
                  <TabsTrigger value="models">ARIMA/GARCH</TabsTrigger>
                  <TabsTrigger value="lstm">LSTM</TabsTrigger>
                  <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                </TabsList>

                <TabsContent value="charts" className="space-y-4">
                  <ChartsTab
                    priceChartRef={priceChartRef}
                    returnsChartRef={returnsChartRef}
                  />
                </TabsContent>

                <TabsContent value="stationarity" className="space-y-4">
                  <StationarityTab
                    adfResult={adfResult}
                    loadingADF={loadingADF}
                  />
                </TabsContent>

                <TabsContent value="models" className="space-y-4">
                  <ModelsTab
                    selectedSymbol={selectedSymbol}
                    timeframe={timeframe}
                    arimaResult={arimaResult}
                    garchResult={garchResult}
                    loadingARIMA={loadingARIMA}
                    loadingGARCH={loadingGARCH}
                    arimaChartRef={arimaChartRef}
                    garchVolChartRef={garchVolChartRef}
                    runArima={runArima}
                    runGarch={runGarch}
                  />
                </TabsContent>

                <TabsContent value="lstm" className="space-y-4">
                  <LSTMTab
                    selectedSymbol={selectedSymbol}
                    lstmResult={lstmResult}
                    loadingLSTM={loadingLSTM}
                    lstmChartRef={lstmChartRef}
                    runLstm={runLstm}
                  />
                </TabsContent>

                <TabsContent value="sentiment" className="space-y-4">
                  <SentimentTab
                    sentimentText={sentimentText}
                    setSentimentText={setSentimentText}
                    finbertResult={finbertResult}
                    ruleSentimentResult={ruleSentimentResult}
                    loadingFinBERT={loadingFinBERT}
                    loadingRuleSentiment={loadingRuleSentiment}
                    runFinBERT={runFinBERT}
                    runRuleSentiment={runRuleSentiment}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : !loading ? (
            <div className="py-8 text-center">
              {error ? (
                <div className="space-y-4">
                  {error.includes("SmartAPI credentials not configured") ? (
                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <Info className="h-5 w-5" />
                          SmartAPI Credentials Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-left">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          To fetch real-time stock data, you need to configure
                          your Angel One SmartAPI credentials.
                        </p>
                        <div className="space-y-1 rounded bg-white p-3 font-mono text-xs dark:bg-gray-800">
                          <p className="mb-2 font-semibold">
                            Add these to{" "}
                            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">
                              backend/.env
                            </code>
                            :
                          </p>
                          <p>SMARTAPI_API_KEY=your_api_key</p>
                          <p>SMARTAPI_CLIENT_CODE=your_client_code</p>
                          <p>SMARTAPI_PASSWORD=your_password</p>
                          <p>SMARTAPI_TOTP_SECRET=your_totp_secret</p>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          After adding credentials, restart the backend server.
                        </p>
                        <p className="text-xs text-gray-500">
                          Get your credentials from:{" "}
                          <a
                            href="https://smartapi.angelone.in/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Angel One SmartAPI
                          </a>
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        Error loading data
                      </p>
                      <p className="text-sm whitespace-pre-line text-gray-600 dark:text-gray-400">
                        {error}
                      </p>
                      {(error.includes("port 5000") ||
                        error.includes("Network error")) && (
                        <p className="mt-2 text-xs text-gray-500">
                          Make sure the backend server is running on port 5000
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedSymbol ? (
                <p className="text-gray-500">
                  No data available for {selectedSymbol}
                </p>
              ) : (
                <p className="text-gray-500">
                  Select a stock to view returns analysis
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
