"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Link2, MoreHorizontal, Star, Trash2 } from "lucide-react";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Sheet,
  SheetContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { initialsOf } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { useTasks } from "../task-store";
import { useDraft } from "../use-draft";
import {
  AssigneesField,
  DatesField,
  DependenciesField,
  Field,
  PriorityField,
  StatusField,
  TagsField,
} from "./panel-fields";
import {
  ActivitySection,
  AttachmentsSection,
  CommentsSection,
  DescriptionSection,
  SubtasksSection,
  TimeSection,
} from "./panel-sections";

/**
 * The task detail panel.
 *
 * Opens over the project rather than navigating to it: the point of a
 * task list is comparison, and a full page transition loses the row you
 * came from, your scroll position and your filters every time you glance
 * at something.
 *
 * Layout is two columns above `lg` — properties on the left, the long
 * content (description, subtasks, comments) on the right — and one
 * column below, where the properties collapse behind a disclosure so the
 * description is not pushed a screen down by eight metadata rows.
 *
 * Prev/next walk the same filtered order the list is showing, so
 * stepping through the panel matches what is on screen behind it rather
 * than some underlying id order.
 */
export function TaskPanel({
  resolveProject,
  taskId,
  onClose,
  onNavigate,
}: {
  /** Which project a task belongs to. A project's own views answer this
   * with a constant; the workspace calendar spans every project, so it
   * has to look the answer up per task. */
  resolveProject: (taskId: string) => Project;
  taskId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const store = useTasks();
  const [propsOpen, setPropsOpen] = useState(false);

  const task = taskId ? store.getTask(taskId) : undefined;
  const project = taskId ? resolveProject(taskId) : undefined;
  const detail = taskId ? store.getDetail(taskId) : undefined;

  const order = store.topLevel;
  const idx = task ? order.findIndex((t) => t.id === task.id) : -1;
  const prev = idx > 0 ? order[idx - 1] : undefined;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : undefined;

  const roster = project?.members ?? [];
  const allTags = useMemo(
    () => Array.from(new Set(store.tasks.flatMap((t) => t.tags ?? []))).sort(),
    [store.tasks]
  );

  const chip = project ? SPACE_COLOR[project.color] : SPACE_COLOR.violet;

  return (
    <Sheet open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent width="2xl" className="p-0" aria-describedby={undefined}>
        {task && detail && project && (
          <>
            {/* Header */}
            <header className="shrink-0 border-b border-border px-5 py-3.5 pr-14">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[9px] font-bold ring-1 ring-inset",
                    chip.chip,
                    chip.text
                  )}
                  aria-hidden="true"
                >
                  {initialsOf(project.name)}
                </span>
                <span className="truncate text-caption text-text-muted">{project.name}</span>
                {task.milestone && (
                  <Badge variant="primary" size="sm">
                    Milestone
                  </Badge>
                )}

                <div className="ml-auto flex items-center gap-0.5">
                  <IconButton
                    label="Previous task"
                    size="sm"
                    disabled={!prev}
                    onClick={() => prev && onNavigate(prev.id)}
                  >
                    <ChevronUp className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Next task"
                    size="sm"
                    disabled={!next}
                    onClick={() => next && onNavigate(next.id)}
                  >
                    <ChevronDown className="size-4" />
                  </IconButton>
                  <IconButton label="Copy link to task" size="sm">
                    <Link2 className="size-4" />
                  </IconButton>
                  <IconButton label="Star task" size="sm">
                    <Star className="size-4" />
                  </IconButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label="Task options" size="sm">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        destructive
                        onSelect={() => {
                          // Close first: the panel is showing a task that
                          // is about to stop existing.
                          onClose();
                          store.deleteTask(task.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* The title is editable in place — opening a modal to
                  rename a task is the kind of friction that makes people
                  leave bad titles alone. */}
              <TaskTitle key={task.id} id={task.id} title={task.title} />
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row-reverse">
              {/* Properties */}
              <aside className="shrink-0 border-border lg:w-[19rem] lg:overflow-y-auto lg:border-l">
                <button
                  type="button"
                  onClick={() => setPropsOpen((v) => !v)}
                  aria-expanded={propsOpen}
                  className="flex w-full items-center justify-between gap-2 border-b border-border px-5 py-2.5
                             text-body-sm font-medium text-text-secondary lg:hidden"
                >
                  Properties
                  <ChevronDown className={cn("size-4 transition-transform", propsOpen && "rotate-180")} />
                </button>

                <div className={cn("px-4 py-3 lg:block", propsOpen ? "block" : "hidden")}>
                  <Field label="Status">
                    <StatusField task={task} />
                  </Field>
                  <Field label="Priority">
                    <PriorityField task={task} />
                  </Field>
                  <Field label="Assignees">
                    <AssigneesField task={task} roster={roster} />
                  </Field>
                  <Field label="Dates">
                    <DatesField task={task} />
                  </Field>
                  <Field label="Tags">
                    <TagsField task={task} available={allTags} />
                  </Field>
                  <Field label="Dependencies">
                    <DependenciesField task={task} all={store.topLevel} />
                  </Field>

                  <div className="mt-4 border-t border-border pt-4">
                    <TimeSection task={task} detail={detail} />
                  </div>
                </div>
              </aside>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Tabs defaultValue="details" className="flex min-h-full flex-col">
                  <div className="sticky top-0 z-10 border-b border-border bg-surface/90 px-5 backdrop-blur-xl">
                    <TabsList>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="comments">
                        Comments
                        {detail.comments.length > 0 && (
                          <span className="ml-1 tabular text-text-muted">{detail.comments.length}</span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="details" className="mt-0 flex flex-col gap-7 px-5 py-5">
                    <DescriptionSection taskId={task.id} detail={detail} />
                    <SubtasksSection task={task} detail={detail} />
                    <AttachmentsSection task={task} detail={detail} />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 px-5 py-5">
                    <CommentsSection task={task} detail={detail} />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 px-5 py-5">
                    <ActivitySection detail={detail} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The title is editable in place — opening a modal to rename a task is
 * the kind of friction that makes people leave bad titles alone.
 *
 * Keyed by task id at the call site, so switching tasks in the panel
 * starts a fresh draft rather than carrying the last one across.
 */
function TaskTitle({ id, title }: { id: string; title: string }) {
  const store = useTasks();
  const [draft, setDraft, flush] = useDraft(title, (next) => {
    const trimmed = next.trim();
    if (trimmed && trimmed !== title) store.updateTask(id, { title: trimmed });
  });

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={flush}
      aria-label="Task title"
      className="mt-2 w-full rounded-md bg-transparent text-h3 text-text-primary transition-colors
                 duration-fast hover:bg-white/[0.03] focus-visible:bg-white/[0.04]
                 focus-visible:outline-none focus-visible:shadow-focus"
    />
  );
}
