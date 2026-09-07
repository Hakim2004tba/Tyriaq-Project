import * as React from "react";
import { FileText, ChevronRight } from "lucide-react";
import type { DocumentRef } from "@flow/types";
import { formatRelativeTime, cn } from "@flow/utils";

export interface DocumentItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  document: DocumentRef;
}

export function DocumentItem({ document, className, ...props }: DocumentItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      {...props}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-body-sm font-medium text-text-primary">{document.title}</span>
        <span className="block text-caption text-text-muted">Updated {formatRelativeTime(document.updatedAt)}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}
