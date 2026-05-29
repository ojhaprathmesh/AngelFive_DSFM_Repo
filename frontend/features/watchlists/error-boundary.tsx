import React from "react";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface Props {
  children: React.ReactNode;
}

export function WatchlistErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary featureName="Watchlist Components">{children}</ErrorBoundary>
  );
}
