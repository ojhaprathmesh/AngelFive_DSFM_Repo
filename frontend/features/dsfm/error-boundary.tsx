import React from "react";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface Props {
  children: React.ReactNode;
}

export function DSFMErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary featureName="Data Science Analytics">
      {children}
    </ErrorBoundary>
  );
}
