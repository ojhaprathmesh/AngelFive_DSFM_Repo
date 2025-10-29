"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { marketDataService } from "@/lib/market-data";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Briefcase,
  AlertCircle,
} from "lucide-react";

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  lastUpdated?: string;
}

export default function Dashboard() {
  const [marketData, setMarketData] = useState<{
    sensex: { data: MarketData | null; isLoading: boolean; error: string | null; lastUpdated: Date | null };
    nifty: { data: MarketData | null; isLoading: boolean; error: string | null; lastUpdated: Date | null };
  }>({ 
    sensex: { data: null, isLoading: true, error: null, lastUpdated: null },
    nifty: { data: null, isLoading: true, error: null, lastUpdated: null }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use the new batch method for optimized API calls
        const results = await marketDataService.getAllMarketDataWithStatus();

        setMarketData({
          sensex: results.sensex,
          nifty: results.nifty
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch market data:", error);
        setError("Failed to load market data. Using fallback data.");
        
        // Use fallback data
        try {
          const fallbackData = marketDataService.getAllFallbackData();
          setMarketData({
            sensex: { 
              data: fallbackData.find((d: any) => d.symbol === "SENSEX") || null,
              isLoading: false,
              error: "Using fallback data",
              lastUpdated: new Date()
            },
            nifty: { 
              data: fallbackData.find((d: any) => d.symbol === "NIFTY") || null,
              isLoading: false,
              error: "Using fallback data",
              lastUpdated: new Date()
            }
          });
        } catch (fallbackError) {
          console.error("Fallback data also failed:", fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const MarketCard = ({ 
    marketInfo, 
    title, 
    description 
  }: { 
    marketInfo: { data: MarketData | null; isLoading: boolean; error: string | null; lastUpdated: Date | null };
    title: string;
    description: string;
  }) => {
    if (marketInfo.isLoading) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-32" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (marketInfo.error && !marketInfo.data) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {marketInfo.error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    if (!marketInfo.data) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No data available
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    const data = marketInfo.data;
    const isPositive = data.change >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-responsive-lg">{title}</span>
            <TrendIcon
              className={`h-5 w-5 ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            />
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-responsive-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{data.price.toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className={isPositive ? "bg-green-600" : "bg-red-600"}
                >
                  {isPositive ? "+" : ""}{data.change.toFixed(2)}
                </Badge>
                <span
                  className={`text-sm font-medium ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ({isPositive ? "+" : ""}{data.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* OHLC Data - Always show for indices */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Open:</span>
                <div className="font-medium">₹{(data.open || 0).toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</div>
              </div>
              <div>
                <span className="text-muted-foreground">High:</span>
                <div className="font-medium text-green-600">₹{(data.high || 0).toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Low:</span>
                <div className="font-medium text-red-600">₹{(data.low || 0).toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Close:</span>
                <div className="font-medium">₹{(data.close || 0).toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</div>
              </div>
            </div>
            
            {/* Show error if data exists but there was an issue */}
            {marketInfo.error && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {marketInfo.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container-responsive py-6 lg:py-8 safe-bottom">
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Header Section */}
        <div className="text-center sm:text-left">
          <h1 className="text-responsive-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Welcome to AngelFive Dashboard!
          </h1>
          <p className="text-responsive-base text-gray-600 dark:text-gray-400 mb-6">
            Real-time market data powered by SmartAPI. Track indices, manage your watchlist, and monitor your portfolio.
          </p>
          
          {error && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {lastUpdated && (
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-sm text-muted-foreground">
              <span>Last updated: {lastUpdated.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <MarketCard
            marketInfo={marketData.sensex}
            title="SENSEX"
            description="BSE Sensex Index - Top 30 companies"
          />
          <MarketCard
            marketInfo={marketData.nifty}
            title="NIFTY 50"
            description="NSE Nifty 50 Index - Top 50 companies"
          />
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-responsive-lg">Market Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-responsive-sm text-gray-600 dark:text-gray-400">
                Advanced charting and technical analysis tools for informed trading decisions.
              </p>
            </CardContent>
          </Card>
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <span className="text-responsive-lg">Watchlist</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-responsive-sm text-gray-600 dark:text-gray-400">
                Track your favorite stocks and get real-time alerts on price movements.
              </p>
            </CardContent>
          </Card>
          
          <Card className="w-full md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                <span className="text-responsive-lg">Portfolio</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-responsive-sm text-gray-600 dark:text-gray-400">
                Comprehensive portfolio management with performance analytics and insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
