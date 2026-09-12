"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@flow/ui";
import { cn } from "@flow/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** What to draw in the cell. */
  cell: (row: T) => ReactNode;
  /** What to sort and search on. Omit to make the column inert. */
  value?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right";
  /** Hidden on narrow screens, so the table never scrolls sideways. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

export interface Filter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
}

const HIDE: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/**
 * The table every operations screen is built from.
 *
 * One implementation rather than five: search, sort, filter, pagination
 * and bulk selection behave identically on users, workspaces,
 * subscriptions and the audit log, which is the difference between a
 * product and five screens that happen to share a colour scheme.
 *
 * Sorting and filtering happen here, on data already in hand. When these
 * pages meet a real backend the same props survive — the work moves into
 * the query, and `rows` becomes a page of results.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  filters = [],
  searchPlaceholder = "Search…",
  onRowClick,
  bulkActions,
  emptyTitle = "Nothing here",
  emptyBody = "No records match what you are looking at.",
  loading = false,
  error,
  pageSize = 8,
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  filters?: Filter<T>[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  loading?: boolean;
  error?: string | null;
  pageSize?: number;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [active, setActive] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;

    for (const filter of filters) {
      const value = active[filter.key];
      if (value) out = out.filter((row) => filter.match(row, value));
    }

    if (q) {
      out = out.filter((row) =>
        columns.some((column) => String(column.value?.(row) ?? "").toLowerCase().includes(q))
      );
    }

    if (sort) {
      const column = columns.find((c) => c.key === sort.key);
      if (column?.value) {
        out = [...out].sort((a, b) => {
          const x = column.value!(a);
          const y = column.value!(b);
          const result = typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y));
          return sort.direction === "asc" ? result : -result;
        });
      }
    }

    return out;
  }, [active, columns, filters, query, rows, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const allOnPageSelected = visible.length > 0 && visible.every((row) => selected.has(row.id));
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const activeFilterCount = Object.values(active).filter(Boolean).length;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) visible.forEach((row) => next.delete(row.id));
      else visible.forEach((row) => next.add(row.id));
      return next;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* ----------------------------- toolbar ---------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>

        {filters.map((filter) => (
          <DropdownMenu key={filter.key}>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <SlidersHorizontal className="size-3.5" />
                {active[filter.key]
                  ? filter.options.find((o) => o.value === active[filter.key])?.label
                  : filter.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={() => {
                  setActive((prev) => ({ ...prev, [filter.key]: "" }));
                  setPage(0);
                }}
              >
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {filter.options.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => {
                    setActive((prev) => ({ ...prev, [filter.key]: option.value }));
                    setPage(0);
                  }}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActive({});
              setPage(0);
            }}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}

        {toolbar}
      </div>

      {/* Bulk bar appears only with a selection, so it never takes room
          from the table it acts on. */}
      {bulkActions && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary-muted/40 px-3 py-2">
          <span className="text-body-sm text-text-primary">
            {selectedRows.length} selected
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {bulkActions(selectedRows, () => setSelected(new Set()))}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </span>
        </div>
      )}

      {/* ------------------------------ table ----------------------------- */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
        {error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger">
              <X className="size-5" />
            </span>
            <p className="text-body font-medium text-text-primary">That did not load</p>
            <p className="max-w-sm text-body-sm text-text-muted">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden="true" />
            <p className="text-body-sm text-text-muted">Loading…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
              <Inbox className="size-5" />
            </span>
            <p className="text-body font-medium text-text-primary">
              {query || activeFilterCount > 0 ? "Nothing matches" : emptyTitle}
            </p>
            <p className="max-w-sm text-body-sm text-text-muted">
              {query || activeFilterCount > 0
                ? "Try a different search, or clear the filters."
                : emptyBody}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60">
                {bulkActions && (
                  <th scope="col" className="w-9 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      aria-label="Select every row on this page"
                      className="size-3.5 accent-[rgb(var(--color-primary))]"
                    />
                  </th>
                )}
                {columns.map((column) => {
                  const sortable = Boolean(column.value);
                  const isSorted = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "px-3 py-2.5 text-caption font-medium text-text-muted",
                        column.align === "right" ? "text-right" : "text-left",
                        column.hideBelow && HIDE[column.hideBelow]
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSort((prev) =>
                              prev?.key === column.key
                                ? { key: column.key, direction: prev.direction === "asc" ? "desc" : "asc" }
                                : { key: column.key, direction: "asc" }
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded transition-colors hover:text-text-primary",
                            "focus-visible:outline-none focus-visible:shadow-focus",
                            isSorted && "text-text-primary"
                          )}
                        >
                          {column.header}
                          {isSorted &&
                            (sort!.direction === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            ))}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "transition-colors duration-fast",
                    onRowClick && "cursor-pointer hover:bg-white/[0.03]",
                    selected.has(row.id) && "bg-primary/[0.06]"
                  )}
                >
                  {bulkActions && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })
                        }
                        aria-label="Select this row"
                        className="size-3.5 accent-[rgb(var(--color-primary))]"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2.5",
                        column.align === "right" ? "text-right" : "text-left",
                        column.hideBelow && HIDE[column.hideBelow],
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------------------------- pagination -------------------------- */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-text-muted">
            {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of{" "}
            {filtered.length}
          </p>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <span className="px-2 text-caption tabular text-text-muted">
                {current + 1} / {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
