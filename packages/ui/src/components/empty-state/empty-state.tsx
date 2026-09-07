import * as React from "react";
import { cn } from "@flow/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ className, icon, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}
      {...props}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium text-text-primary">{title}</p>
        {description && <p className="text-body-sm text-text-secondary max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
