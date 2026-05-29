import * as React from "react";

import { cn } from "@/lib/utils";

interface DashboardSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  container?: boolean;
}

export function DashboardSection({
  className,
  children,
  container = false,
  ...props
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        "w-full space-y-6",
        container && "container mx-auto max-w-7xl",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
