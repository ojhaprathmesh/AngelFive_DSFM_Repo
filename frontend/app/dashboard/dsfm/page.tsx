"use client";

import { BarChart3, Layers, Network, PieChart, TrendingUp } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorrelationAnalysis } from "@/features/dsfm/components/correlation-analysis";
import { NetworkAnalysis } from "@/features/dsfm/components/network-analysis";
import { PCAAnalysis } from "@/features/dsfm/components/pca-analysis";
import { PortfolioOptimization } from "@/features/dsfm/components/portfolio-optimization";
import { ReturnsAnalysis } from "@/features/dsfm/components/returns-analysis";
import { DSFMErrorBoundary } from "@/features/dsfm/error-boundary";

export default function DSFMPage() {
  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Data Science in Financial Markets
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Advanced analytics, statistical modeling, and portfolio optimization
          tools
        </p>
      </div>

      <Tabs defaultValue="returns" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 p-1">
          <TabsTrigger
            value="returns"
            className="flex min-w-fit flex-1 items-center gap-2"
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            Returns Analysis
          </TabsTrigger>
          <TabsTrigger
            value="correlation"
            className="flex min-w-fit flex-1 items-center gap-2"
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            Correlation
          </TabsTrigger>
          <TabsTrigger
            value="portfolio"
            className="flex min-w-fit flex-1 items-center gap-2"
          >
            <PieChart className="h-4 w-4 shrink-0" />
            Portfolio Optimization
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="flex min-w-fit flex-1 items-center gap-2"
          >
            <Network className="h-4 w-4 shrink-0" />
            Network Analysis
          </TabsTrigger>
          <TabsTrigger
            value="pca"
            className="flex min-w-fit flex-1 items-center gap-2"
          >
            <Layers className="h-4 w-4 shrink-0" />
            PCA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="mt-6">
          <DSFMErrorBoundary>
            <ReturnsAnalysis />
          </DSFMErrorBoundary>
        </TabsContent>
        <TabsContent value="correlation" className="mt-6">
          <DSFMErrorBoundary>
            <CorrelationAnalysis />
          </DSFMErrorBoundary>
        </TabsContent>
        <TabsContent value="portfolio" className="mt-6">
          <DSFMErrorBoundary>
            <PortfolioOptimization />
          </DSFMErrorBoundary>
        </TabsContent>
        <TabsContent value="network" className="mt-6">
          <DSFMErrorBoundary>
            <NetworkAnalysis />
          </DSFMErrorBoundary>
        </TabsContent>
        <TabsContent value="pca" className="mt-6">
          <DSFMErrorBoundary>
            <PCAAnalysis />
          </DSFMErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
