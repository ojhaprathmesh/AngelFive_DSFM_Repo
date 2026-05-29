import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function LoadingState({
  message = "Loading...",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in-50 flex min-h-[200px] w-full flex-col items-center justify-center p-8 text-center",
        className,
      )}
      {...props}
    >
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}
