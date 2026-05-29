import { AlertCircle } from "lucide-react";
import React from "react";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface Props {
  children: React.ReactNode;
}

export function NotificationErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary
      featureName="Notifications"
      fallback={
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-2 text-xs text-red-500 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <span>Notifications error</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
