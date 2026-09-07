import * as React from "react";
import { cn } from "@flow/utils";
import { Card, type CardProps } from "./card";

export interface SectionCardProps extends Omit<CardProps, "title"> {
  title: React.ReactNode;
  /** Sits under the title — counts, ranges, "3 due this week". */
  subtitle?: React.ReactNode;
  /** Right-aligned control: a "View all" link, a filter, a menu. */
  action?: React.ReactNode;
  /** Secondary row under the header — tabs, filter chips. */
  toolbar?: React.ReactNode;
  /** Removes body padding, for lists that draw their own dividers
   * edge-to-edge. */
  flush?: boolean;
  children: React.ReactNode;
}

/**
 * A titled panel — the repeating unit of every dashboard, report and
 * space overview in Tyriaq.
 *
 * Extracted because the alternative is eight hand-rolled headers that
 * drift apart within a sprint: one pads 20px and another 16, one puts
 * "View all" in a ghost button and another in a link. The header height,
 * the divider, and the title/action relationship are decided once here.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  toolbar,
  flush = false,
  className,
  children,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <div className="flex items-start justify-between gap-3 px-5 pb-3.5 pt-4">
        <div className="min-w-0">
          <h2 className="truncate text-h4 text-text-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-caption text-text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      {toolbar && <div className="px-5 pb-3">{toolbar}</div>}
      <div className={cn("min-h-0 flex-1", flush ? "" : "px-5 pb-5")}>{children}</div>
    </Card>
  );
}
