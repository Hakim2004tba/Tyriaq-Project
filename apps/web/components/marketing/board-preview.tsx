import { CalendarDays, Plus, Search } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * The board, as the second proof.
 *
 * The hero shows the overview; this shows the working surface, which is
 * where people actually spend the day. Same construction — real tokens,
 * no image.
 */

const COLUMNS = [
  {
    name: "To do",
    count: 4,
    cards: [
      { title: "Home page mockup", tags: [["Design", "primary"], ["Urgent", "danger"]], due: "Today" },
      { title: "Backend development", tags: [["Dev", "info"]], due: "Tomorrow" },
    ],
  },
  {
    name: "In progress",
    count: 3,
    cards: [
      { title: "API integration", tags: [["Dev", "info"], ["Important", "warning"]], due: "Today" },
      { title: "Tests and fixes", tags: [["Tests", "primary"]], due: "Tomorrow" },
    ],
  },
  {
    name: "Done",
    count: 5,
    cards: [
      { title: "Landing page", tags: [["Design", "primary"], ["Done", "success"]], due: "Yesterday" },
      { title: "Database", tags: [["Dev", "info"]], due: "Yesterday" },
    ],
  },
] as const;

const TAG_TONE: Record<string, string> = {
  primary: "bg-primary-muted text-primary",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning",
  success: "bg-success-subtle text-success",
};

export function BoardPreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-background shadow-[0_40px_120px_-35px_rgba(88,28,235,0.5)]",
        className
      )}
    >
      <div className="flex min-h-[340px] text-[10px] leading-tight">
        <aside className="hidden w-[118px] shrink-0 flex-col gap-2 border-r border-white/[0.06] bg-surface-muted/80 p-2.5 sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-md bg-brand text-[9px] font-bold text-white">
              T
            </span>
            <span className="text-[11px] font-semibold text-text-primary">tyriaq</span>
          </div>
          {["Home", "My tasks", "Projects", "Calendar", "Messages", "Files", "Team"].map((item, i) => (
            <span
              key={item}
              className={cn(
                "truncate rounded-md px-1.5 py-1",
                i === 2 ? "bg-primary-muted text-primary" : "text-text-muted"
              )}
            >
              {item}
            </span>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-info/25 text-[8px] text-info">
              A
            </span>
            <span className="truncate text-[11px] font-medium text-text-primary">Academy website</span>
            <span className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md border border-white/[0.06] bg-surface-muted p-0.5 sm:flex">
              {["List", "Board", "Calendar"].map((view) => (
                <span
                  key={view}
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    view === "Board" ? "bg-surface-elevated text-text-primary" : "text-text-muted"
                  )}
                >
                  {view}
                </span>
              ))}
            </span>
            <Search className="size-3 shrink-0 text-text-muted" />
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Plus className="size-2.5" />
            </span>
          </header>

          <div className="grid min-w-0 grid-cols-3 gap-1.5 p-2.5">
            {COLUMNS.map((column) => (
              <section key={column.name} className="min-w-0 rounded-lg bg-surface-muted/60 p-1.5">
                <p className="mb-1.5 flex items-center justify-between gap-1 px-0.5">
                  <span className="truncate font-medium text-text-primary">{column.name}</span>
                  <span className="shrink-0 tabular-nums text-text-muted">{column.count}</span>
                </p>

                <ul className="flex flex-col gap-1.5">
                  {column.cards.map((card) => (
                    <li
                      key={card.title}
                      className="rounded-md border border-white/[0.06] bg-surface p-1.5"
                    >
                      <p className="truncate text-text-secondary">{card.title}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {card.tags.map(([label, tone]) => (
                          <span
                            key={label}
                            className={cn("rounded px-1 py-px text-[8px]", TAG_TONE[tone] ?? TAG_TONE.primary)}
                          >
                            {label}
                          </span>
                        ))}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[8px] text-text-muted">
                        <CalendarDays className="size-2 shrink-0" />
                        {card.due}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
