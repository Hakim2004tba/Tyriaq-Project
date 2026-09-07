"use client";

import { useId, useState, type ReactNode } from "react";
import { Table2 } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * The shell every chart sits in.
 *
 * Carries the one thing a chart cannot do for itself: an equivalent
 * table. Colour and position are not available to everyone, and a
 * figure somebody cannot read is not a figure — so every chart here can
 * be switched to the numbers behind it.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  table,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  table: { columns: string[]; rows: (string | number)[][] };
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3", className)}>
      <figcaption className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-body font-medium text-text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-caption text-text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            aria-controls={id}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:shadow-focus",
              showTable ? "bg-primary-muted text-primary" : "text-text-muted hover:bg-white/5 hover:text-text-primary"
            )}
            title={showTable ? "Show chart" : "Show the numbers"}
          >
            <Table2 className="size-3.5" />
            <span className="sr-only">{showTable ? "Show chart" : "Show the numbers"}</span>
          </button>
        </div>
      </figcaption>

      <div id={id} className="min-w-0">
        {showTable ? (
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-body-sm">
              <thead className="sticky top-0 bg-surface-muted">
                <tr>
                  {table.columns.map((column, i) => (
                    <th
                      key={column}
                      scope="col"
                      className={cn(
                        "px-2.5 py-1.5 text-caption font-medium text-text-muted",
                        i === 0 ? "text-left" : "text-right"
                      )}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-2.5 py-1.5",
                          j === 0 ? "text-text-secondary" : "text-right tabular text-text-primary"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>

      {/* A legend is present whenever there are two or more series, so
          identity never rests on colour alone. */}
      {legend && legend.length > 1 && !showTable && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-caption text-text-secondary">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
