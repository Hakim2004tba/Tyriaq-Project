import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@flow/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-body-sm", className)} {...props}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a href={item.href} className="text-text-secondary transition-colors hover:text-text-primary">
                  {item.label}
                </a>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-text-primary" : "text-text-secondary"}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3.5 text-text-muted" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
