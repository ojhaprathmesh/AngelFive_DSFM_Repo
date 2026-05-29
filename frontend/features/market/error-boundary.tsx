import React from "react";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface Props {
  children: React.ReactNode;
}

export function MarketErrorBoundary({ children }: Props) {
  return <ErrorBoundary featureName="Market Data">{children}</ErrorBoundary>;
}
