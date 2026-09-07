import * as React from "react";
import { ListFilter, ChevronDown, X } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@flow/types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@flow/types";
import { SearchInput } from "../search-input/search-input";
import { Button } from "../button/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../dropdown-menu/dropdown-menu";
import { Avatar } from "../avatar/avatar";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";

export interface TaskFiltersValue {
  status: TaskStatus[];
  priority: TaskPriority[];
  assigneeId: string[];
  query: string;
}

export interface TaskFiltersProps {
  value: TaskFiltersValue;
  onChange: (value: TaskFiltersValue) => void;
  assignableUsers: { id: string; name: string; avatarUrl?: string | null }[];
}

/** Filter bar shared by List and Board — both consume the same
 * TaskFiltersValue, so filtering logic never diverges between views. */
export function TaskFilters({ value, onChange, assignableUsers }: TaskFiltersProps) {
  const activeCount = value.status.length + value.priority.length + value.assigneeId.length;

  function toggle<K extends "status" | "priority" | "assigneeId">(key: K, item: TaskFiltersValue[K][number]) {
    const current = value[key] as unknown[];
    const next = current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full max-w-xs">
        <SearchInput
          placeholder="Search tasks…"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </div>

      <FilterDropdown label="Status" count={value.status.length}>
        {TASK_STATUSES.map((s) => (
          <DropdownMenuCheckboxItem
            key={s}
            checked={value.status.includes(s)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle("status", s)}
          >
            {TASK_STATUS_CONFIG[s].label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterDropdown>

      <FilterDropdown label="Priority" count={value.priority.length}>
        {TASK_PRIORITIES.map((p) => (
          <DropdownMenuCheckboxItem
            key={p}
            checked={value.priority.includes(p)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle("priority", p)}
          >
            {PRIORITY_CONFIG[p].label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterDropdown>

      <FilterDropdown label="Assignee" count={value.assigneeId.length}>
        {assignableUsers.length === 0 && (
          <p className="px-2 py-1.5 text-caption text-text-muted">No assignable members</p>
        )}
        {assignableUsers.map((u) => (
          <DropdownMenuCheckboxItem
            key={u.id}
            checked={value.assigneeId.includes(u.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle("assigneeId", u.id)}
          >
            <span className="flex items-center gap-2">
              <Avatar name={u.name} src={u.avatarUrl} size="xs" />
              {u.name}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </FilterDropdown>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ status: [], priority: [], assigneeId: [], query: value.query })}
        >
          <X className="size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}

function FilterDropdown({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <ListFilter className="size-3.5" />
          {label}
          {count > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
