"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic React class error boundary.
 * Prevents a single component crash from taking down the entire dashboard.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const feature = this.props.featureName || "Unknown Component";
    console.error(
      `[ErrorBoundary: ${feature}] crashed:`,
      error,
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const featureName = this.props.featureName
        ? `${this.props.featureName} `
        : "";

      return (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/50 dark:bg-red-900/10">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">
              {featureName}Unavailable
            </h3>
            <p className="max-w-[250px] text-xs text-red-600/80 dark:text-red-400/80">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="group mt-2 flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            <RefreshCcw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
