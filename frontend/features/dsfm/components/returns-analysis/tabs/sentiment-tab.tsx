"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

interface SentimentTabProps {
  sentimentText: string;
  setSentimentText: (text: string) => void;
  finbertResult: FinBERTResult | null;
  ruleSentimentResult: RuleSentimentResult | null;
  loadingFinBERT: boolean;
  loadingRuleSentiment: boolean;
  runFinBERT: () => Promise<void>;
  runRuleSentiment: () => Promise<void>;
}

export function SentimentTab({
  sentimentText,
  setSentimentText,
  finbertResult,
  ruleSentimentResult,
  loadingFinBERT,
  loadingRuleSentiment,
  runFinBERT,
  runRuleSentiment,
}: SentimentTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis</CardTitle>
        <CardDescription>
          Analyze financial sentiment using FinBERT and rule-based methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Enter Text for Analysis
          </label>
          <textarea
            value={sentimentText}
            onChange={(e) => setSentimentText(e.target.value)}
            placeholder="Enter financial news, analysis, or commentary..."
            className="min-h-30 w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-blue-800"
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => void runFinBERT()}
            disabled={loadingFinBERT || !sentimentText.trim()}
            className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {loadingFinBERT ? "Analyzing..." : "FinBERT Analysis"}
          </Button>
          <Button
            onClick={() => void runRuleSentiment()}
            disabled={loadingRuleSentiment || !sentimentText.trim()}
            variant="outline"
            className="flex-1 border-2"
          >
            {loadingRuleSentiment ? "Analyzing..." : "Rule-Based Analysis"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {finbertResult && (
            <div className="rounded-xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-800 dark:from-blue-900/20 dark:to-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  FinBERT Results
                </p>
                <Badge
                  className={`px-3 py-1 text-xs ${
                    finbertResult.sentiment === "positive"
                      ? "bg-green-500 hover:bg-green-600"
                      : finbertResult.sentiment === "negative"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gray-500 hover:bg-gray-600"
                  }`}
                >
                  {finbertResult.sentiment}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Score
                  </span>
                  <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                    {finbertResult.score?.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Confidence
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-blue-500 to-blue-600 transition-all"
                        style={{
                          width: `${(finbertResult.confidence ?? 0) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                      {((finbertResult.confidence ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {ruleSentimentResult && (
            <div className="rounded-xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-white p-5 shadow-sm dark:border-purple-800 dark:from-purple-900/20 dark:to-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200">
                  Rule-Based Results
                </p>
                <Badge
                  className={`px-3 py-1 text-xs ${
                    ruleSentimentResult.sentiment === "bullish"
                      ? "bg-green-500 hover:bg-green-600"
                      : ruleSentimentResult.sentiment === "bearish"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-gray-500 hover:bg-gray-600"
                  }`}
                >
                  {ruleSentimentResult.sentiment}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Bullish Signals
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {ruleSentimentResult.bullish_signals}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Bearish Signals
                  </span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {ruleSentimentResult.bearish_signals}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Confidence
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-purple-500 to-purple-600 transition-all"
                        style={{
                          width: `${(ruleSentimentResult.confidence ?? 0) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                      {((ruleSentimentResult.confidence ?? 0) * 100).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
