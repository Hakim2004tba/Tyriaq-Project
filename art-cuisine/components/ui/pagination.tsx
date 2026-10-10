"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageList(page: number, pageCount: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  const add = (p: number) => pages.push(p);
  add(1);
  if (page > 3) pages.push("ellipsis");
  for (let p = Math.max(2, page - 1); p <= Math.min(pageCount - 1, page + 1); p++) {
    add(p);
  }
  if (page < pageCount - 2) pages.push("ellipsis");
  if (pageCount > 1) add(pageCount);
  return pages;
}

function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const pages = getPageList(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        aria-label="Page précédente"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-text-secondary transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-text-muted"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              "focus-ring flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
              p === page
                ? "bg-ink-950 text-white"
                : "text-text-secondary hover:bg-stone-100",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Page suivante"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-md border border-border-default text-text-secondary transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export { Pagination };
