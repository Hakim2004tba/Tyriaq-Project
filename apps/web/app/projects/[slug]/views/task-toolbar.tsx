"use client";

import { ArrowDownUp, Check, ChevronDown, Columns3, Search, SlidersHorizontal, Users, X } from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@flow/ui";
import { cn } from "@flow/utils";
import type { Person, Priority } from "@/lib/data/task-types";

export type SortKey = "manual" | "due" | "priority" | "title" | "assignee";

/** What the board's columns are cut by. The List view is always grouped
 * by status, so it simply does not pass these props. */
export type GroupKey = "status" | "assignee" | "priority" | "tag";

export const GROUP_LABELS: Record<GroupKey, string> = {
  status: "Status",
  assignee: "Assignee",
  priority: "Priority",
  tag: "Tag",
};

export const SORT_LABELS: Record<SortKey, string> = {
  manual: "Manual order",
  due: "Due date",
  priority: "Priority",
  title: "Title",
  assignee: "Assignee",
};

export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

const PRIORITY_DOT: Record<Priority, string> = {
  urgent: "bg-danger",
  high: "bg-danger/70",
  medium: "bg-warning",
  low: "bg-success",
};

export interface TaskFilters {
  query: string;
  assignees: string[];
  priorities: Priority[];
  tags: string[];
}

export const EMPTY_FILTERS: TaskFilters = { query: "", assignees: [], priorities: [], tags: [] };

export function activeFilterCount(f: TaskFilters): number {
  return f.assignees.length + f.priorities.length + f.tags.length + (f.query.trim() ? 1 : 0);
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * The task list toolbar.
 *
 * Assignee filtering gets its own control rather than living inside the
 * generic filter menu: "what is on my plate" is the single most common
 * question asked of a task list, and burying it two clicks deep behind a
 * funnel icon is what makes people stop using filters at all.
 *
 * Sort defaults to `manual` because the list is drag-orderable. Any
 * other default would silently discard the order people arrange by hand,
 * and dragging under an active sort is a lie — so the list disables drag
 * whenever sort is not manual, and says so.
 */
export function TaskToolbar({
  filters,
  onChange,
  sort,
  onSortChange,
  people,
  tags,
  resultCount,
  totalCount,
  group,
  onGroupChange,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  /** Omit both to hide sorting — a calendar is ordered by the grid, so
   * a sort control there would be inert. */
  sort?: SortKey;
  onSortChange?: (s: SortKey) => void;
  people: Person[];
  tags: string[];
  resultCount: number;
  totalCount: number;
  /** Omit both to hide the grouping control entirely. */
  group?: GroupKey;
  onGroupChange?: (g: GroupKey) => void;
}) {
  const count = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          icon={<Search className="size-4" />}
          trailing={
            filters.query ? (
              <button
                type="button"
                onClick={() => onChange({ ...filters, query: "" })}
                aria-label="Clear search"
                className="rounded transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
              >
                <X className="size-4" />
              </button>
            ) : undefined
          }
          className="w-full sm:w-64"
        />

        {/* Assignee — promoted out of the filter menu on purpose. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="md">
              <Users className="size-4" />
              <span className="hidden sm:inline">
                {filters.assignees.length === 0 ? "Assignee" : `${filters.assignees.length} selected`}
              </span>
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {people.map((p) => {
              const on = filters.assignees.includes(p.id);
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    onChange({ ...filters, assignees: toggle(filters.assignees, p.id) });
                  }}
                >
                  <span className="flex size-4 items-center justify-center">{on && <Check className="size-4" />}</span>
                  <Avatar name={p.name} size="xs" />
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              );
            })}
            {filters.assignees.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onChange({ ...filters, assignees: [] })}>
                  <span className="size-4" />
                  Clear
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority + tags */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="md">
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filter</span>
              {filters.priorities.length + filters.tags.length > 0 && (
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <p className="px-2.5 py-1.5 text-overline uppercase text-text-muted">Priority</p>
            {PRIORITIES.map((p) => (
              <DropdownMenuItem
                key={p}
                onSelect={(e) => {
                  e.preventDefault();
                  onChange({ ...filters, priorities: toggle(filters.priorities, p) });
                }}
              >
                <span className="flex size-4 items-center justify-center">
                  {filters.priorities.includes(p) && <Check className="size-4" />}
                </span>
                <span className={cn("size-2 rounded-full", PRIORITY_DOT[p])} aria-hidden="true" />
                <span className="capitalize">{p}</span>
              </DropdownMenuItem>
            ))}
            {tags.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <p className="px-2.5 py-1.5 text-overline uppercase text-text-muted">Tags</p>
                {tags.map((t) => (
                  <DropdownMenuItem
                    key={t}
                    onSelect={(e) => {
                      e.preventDefault();
                      onChange({ ...filters, tags: toggle(filters.tags, t) });
                    }}
                  >
                    <span className="flex size-4 items-center justify-center">
                      {filters.tags.includes(t) && <Check className="size-4" />}
                    </span>
                    {t}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {group && onGroupChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md">
                <Columns3 className="size-4" />
                <span className="hidden truncate lg:inline">Group: {GROUP_LABELS[group]}</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {(Object.keys(GROUP_LABELS) as GroupKey[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => onGroupChange(k)}>
                  <span className="flex size-4 items-center justify-center">
                    {group === k && <Check className="size-4" />}
                  </span>
                  {GROUP_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {sort && onSortChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md">
                <ArrowDownUp className="size-4" />
                <span className="hidden truncate lg:inline">{SORT_LABELS[sort]}</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => onSortChange(k)}>
                  <span className="flex size-4 items-center justify-center">
                    {sort === k && <Check className="size-4" />}
                  </span>
                  {SORT_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {count > 0 && (
          <>
            <span className="text-caption tabular text-text-muted">
              {resultCount} of {totalCount}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
              Clear all
            </Button>
          </>
        )}
      </div>

      {sort && sort !== "manual" && (
        <p className="text-caption text-text-muted">
          Sorted by {SORT_LABELS[sort].toLowerCase()} — switch to manual order to drag tasks.
        </p>
      )}
    </div>
  );
}
