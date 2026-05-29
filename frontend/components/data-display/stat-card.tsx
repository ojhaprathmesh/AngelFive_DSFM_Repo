import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number | React.ReactNode;
  chart?: React.ReactNode;
  footer?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  chart,
  footer,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <CardContent className="flex flex-1 flex-col justify-center p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {value}
            </h3>
          </div>
          {chart && <div className="h-16 w-24 shrink-0">{chart}</div>}
        </div>
        {footer && <div className="mt-4">{footer}</div>}
      </CardContent>
    </Card>
  );
}
