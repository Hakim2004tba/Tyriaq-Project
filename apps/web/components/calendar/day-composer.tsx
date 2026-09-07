"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { initialsOf } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";

/**
 * Create a task on a specific date.
 *
 * On a workspace-wide calendar the date is known but the PROJECT is not,
 * so the composer asks for it rather than guessing — a task filed into
 * the wrong project is worse than one extra control. Inside a single
 * project there is nothing to choose, so the selector is omitted.
 */
export function DayComposer({
  projects,
  defaultProjectId,
  onCreate,
  onCancel,
  autoFocus = true,
}: {
  projects: Project[];
  defaultProjectId?: string;
  onCreate: (title: string, projectId: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.slug ?? "");
  const selected = projects.find((p) => p.slug === projectId) ?? projects[0];
  const showPicker = projects.length > 1;

  function submit(value: string) {
    const title = value.trim();
    if (title) onCreate(title, projectId);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border-brand bg-surface p-1.5 shadow-glow-sm">
      <input
        autoFocus={autoFocus}
        placeholder="Task name, then Enter"
        aria-label="New task name"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(e.currentTarget.value);
            e.currentTarget.value = "";
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={(e) => {
          // Blur into the project dropdown must not discard the draft.
          if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.closest("[data-composer]")) return;
          submit(e.currentTarget.value);
          onCancel();
        }}
        className="h-7 w-full rounded-sm bg-surface-muted px-2 text-caption text-text-primary
                   placeholder:text-text-muted focus-visible:outline-none"
      />

      {showPicker && selected && (
        <div data-composer className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1.5 py-1 text-left
                           transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] text-[7px] font-bold ring-1 ring-inset",
                    SPACE_COLOR[selected.color].chip,
                    SPACE_COLOR[selected.color].text
                  )}
                  aria-hidden="true"
                >
                  {initialsOf(selected.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">
                  {selected.name}
                </span>
                <ChevronDown className="size-3 shrink-0 text-text-muted" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((p) => (
                <DropdownMenuItem key={p.slug} onSelect={() => setProjectId(p.slug)}>
                  <span className="flex size-4 items-center justify-center">
                    {projectId === p.slug && <Check className="size-4" />}
                  </span>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function AddOnDayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={onClick}
      className="w-full justify-start text-text-muted hover:text-text-primary"
    >
      <Plus className="size-3.5" />
      {label}
    </Button>
  );
}
