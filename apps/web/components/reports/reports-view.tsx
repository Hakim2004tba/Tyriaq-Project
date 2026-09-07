"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Check, LayoutGrid, Plus, RotateCcw, Settings2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import type { ReportData } from "@/lib/data/analytics";
import type { Person } from "@/lib/data/task-types";
import { KpiCard } from "./charts/kpi-card";
import { WIDGETS, WIDGET_META, WidgetCard, formatMinutes, type WidgetId } from "./widgets";

const RANGES = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "365", label: "Last 12 months" },
] as const;

const LAYOUT_KEY = "tyriaq:reports:layout";

/**
 * The reports surface.
 *
 * Filters live in the URL so a view can be sent to somebody — "our
 * overdue work this quarter" is a link, not a description of which
 * dropdowns to set. The widget layout does NOT: which cards somebody
 * keeps is a personal preference, and putting it in the URL would mean
 * sharing a filtered view also imposed your layout on the reader.
 */
export function ReportsView({
  data,
  projects,
  members,
  range,
  projectId,
  memberId,
  from,
  to,
}: {
  data: ReportData;
  projects: { id: string; name: string }[];
  members: Person[];
  range: string;
  projectId: string | null;
  memberId: string | null;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [layout, setLayout] = useState<WidgetId[]>([...WIDGETS]);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<WidgetId | null>(null);

  /*
    The saved layout is read after mount, not during render: the server
    has no access to localStorage, and using it while rendering would
    produce different markup on the server and the client.
  */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return;
      // Filtered against the known widgets, so a layout saved before a
      // widget was renamed or removed cannot render a blank card.
      const valid = parsed.filter((id): id is WidgetId => WIDGETS.includes(id as WidgetId));
      if (valid.length > 0) setLayout(valid);
    } catch {
      // A corrupt or unreadable preference is not worth surfacing; the
      // default layout is a perfectly good answer.
    }
  }, []);

  const persist = useCallback((next: WidgetId[]) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
    } catch {
      // Private windows and blocked storage: the layout still works for
      // this session, it just will not be remembered.
    }
  }, []);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const qs = new URLSearchParams(params.toString());
      if (value === null) qs.delete(key);
      else qs.set(key, value);
      const query = qs.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  const hidden = useMemo(() => WIDGETS.filter((id) => !layout.includes(id)), [layout]);

  function move(target: WidgetId) {
    if (!dragging || dragging === target) return;
    const next = layout.filter((id) => id !== dragging);
    const index = next.indexOf(target);
    next.splice(index, 0, dragging);
    persist(next);
  }

  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? "Custom range";
  const projectLabel = projectId ? projects.find((p) => p.id === projectId)?.name ?? "Project" : "All projects";
  const memberLabel = memberId ? members.find((m) => m.id === memberId)?.name ?? "Member" : "Everyone";

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-text-primary">Reports</h1>
          <p className="mt-1 text-body text-text-secondary">
            {rangeLabel.toLowerCase().startsWith("last") ? rangeLabel : `${from} to ${to}`} · {projectLabel} · {memberLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu
            icon={<CalendarRange className="size-4" />}
            label={rangeLabel}
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onSelect={(id) => setParam("range", id)}
          />
          <FilterMenu
            icon={<LayoutGrid className="size-4" />}
            label={projectLabel}
            options={[{ id: "", label: "All projects" }, ...projects.map((p) => ({ id: p.id, label: p.name }))]}
            value={projectId ?? ""}
            onSelect={(id) => setParam("project", id || null)}
          />
          <FilterMenu
            icon={<Check className="size-4" />}
            label={memberLabel}
            options={[{ id: "", label: "Everyone" }, ...members.map((m) => ({ id: m.id, label: m.name }))]}
            value={memberId ?? ""}
            onSelect={(id) => setParam("member", id || null)}
          />

          <Button
            variant={editing ? "primary" : "secondary"}
            size="md"
            onClick={() => setEditing((v) => !v)}
          >
            <Settings2 className="size-4" />
            {editing ? "Done" : "Edit widgets"}
          </Button>
        </div>
      </header>

      {/* KPI row: the headline figures, each against the equivalent
          window before it so a number has something to mean. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Tasks completed"
          value={data.totals.completed}
          previous={data.totals.previous.completed}
        />
        <KpiCard
          label="Tasks created"
          value={data.totals.created}
          previous={data.totals.previous.created}
        />
        <KpiCard
          label="Completion rate"
          value={data.totals.completionRate}
          suffix="%"
          previous={data.totals.previous.completionRate}
        />
        <KpiCard
          label="Overdue now"
          value={data.totals.overdue}
          invert
          hint={`of ${data.totals.openTasks} open tasks`}
        />
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-card">
          <p className="truncate text-caption text-text-muted">Time tracked</p>
          <p className="text-h2 tabular text-text-primary">{formatMinutes(data.totals.minutes)}</p>
          <p className="truncate text-caption text-text-muted">
            {data.totals.previous.minutes > 0
              ? `${formatMinutes(data.totals.previous.minutes)} in the previous period`
              : "No time logged previously"}
          </p>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-muted px-3 py-2.5">
          <p className="min-w-0 flex-1 text-body-sm text-text-secondary">
            Drag a card to reorder it, or remove one with ×. Saved on this device only.
          </p>
          {hidden.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Plus className="size-3.5" />
                  Add widget
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {hidden.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => persist([...layout, id])}>
                    <span className="min-w-0">
                      <span className="block truncate">{WIDGET_META[id].title}</span>
                      <span className="block truncate text-caption text-text-muted">
                        {WIDGET_META[id].description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              persist([...WIDGETS]);
              toast.success("Layout reset.");
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {layout.map((id) => (
          <WidgetCard
            key={id}
            id={id}
            data={data}
            editing={editing}
            dragging={dragging === id}
            onRemove={() => persist(layout.filter((widget) => widget !== id))}
            onDragStart={() => setDragging(id)}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              move(id);
            }}
            onDrop={() => setDragging(null)}
            onDragEnd={() => setDragging(null)}
          />
        ))}
      </div>

      {layout.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-body-sm text-text-muted">
          Every widget is hidden. Use “Edit widgets” to add some back.
        </p>
      )}
    </div>
  );
}

function FilterMenu({
  icon,
  label,
  options,
  value,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="md">
          {icon}
          <span className="max-w-[9rem] truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        {options.map((option, i) => (
          <div key={option.id || "all"}>
            {i === 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => onSelect(option.id)}>
              <span className="flex size-4 shrink-0 items-center justify-center">
                {option.id === value && <Check className="size-4" />}
              </span>
              <span className={cn("truncate", option.id === value && "text-text-primary")}>
                {option.label}
              </span>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
