"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Link2,
  MessageSquarePlus,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import {
  AvatarGroup,
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { initialsOf } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { discussTask } from "@/lib/actions/chat";
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
 * Opens over the workspace rather than navigating to it: the point of a
 * task list is comparison, and a full page transition loses the row you
 * came from, your scroll position and your filters every time you glance
 * at something.
 *
 * A CENTRED modal, not a side drawer. A task is the thing you are doing
 * when it is open, and a panel pinned to one edge fights the page it is
 * covering for attention; a modal settles that — the workspace dims
 * behind it and the task is unambiguously the live surface.
 *
 * Inside, two columns above `lg`: the long content (description,
 * subtasks, attachments) beside a properties rail. Below that the rail
 * moves above the content behind a disclosure, so a description is not
 * pushed a screen down by nine metadata rows on a phone.
 *
 * Escape, the backdrop and the close button all dismiss it, focus is
 * trapped while it is open and page scrolling is locked — all of which
 * come from the dialog primitive rather than being re-implemented here.
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
  const [copied, setCopied] = useState(false);
  const [discussing, setDiscussing] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * A link straight to this task, open.
   *
   * Built from the current location rather than a hardcoded origin, so
   * it is correct in development, on a preview deployment and in
   * production without being told which one it is.
   */
  const copyLink = useCallback(async () => {
    if (!taskId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("task", taskId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright; saying so beats a
      // button that silently does nothing.
      toast.error("Your browser would not let us copy. Copy the address bar instead.");
    }
  }, [taskId]);

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
    <Dialog open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] w-[min(96vw,980px)] max-w-none flex-col overflow-hidden rounded-2xl p-0"
      >
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
                <Link
                  href={`/spaces/${project.spaceSlug}`}
                  className="shrink-0 rounded text-caption text-text-muted transition-colors hover:text-text-primary
                             focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {project.spaceName}
                </Link>
                <ChevronRight className="size-3 shrink-0 text-text-muted" aria-hidden="true" />
                <Link
                  href={`/projects/${project.slug}`}
                  className="min-w-0 truncate rounded text-caption text-text-muted transition-colors hover:text-text-primary
                             focus-visible:outline-none focus-visible:shadow-focus"
                >
                  {project.name}
                </Link>
                {task.milestone && (
                  <Badge variant="primary" size="sm">
                    Milestone
                  </Badge>
                )}

                {/* Who is on it, in the header where it is legible at a
                    glance; the rail below is where it is changed. */}
                {task.assignees.length > 0 && (
                  <span className="ml-1 shrink-0">
                    <AvatarGroup
                      people={task.assignees.map((a) => ({ id: a.id, name: a.name }))}
                      max={3}
                      size="xs"
                    />
                  </span>
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
                  <IconButton
                    label={copied ? "Link copied" : "Copy link to task"}
                    size="sm"
                    onClick={copyLink}
                  >
                    {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
                  </IconButton>
                  {/*
                    Discussing a task belongs next to copying a link to
                    it: both are "get somebody else's attention on this",
                    and the difference is only whether you already know
                    where to send it.
                  */}
                  <IconButton
                    label="Discuss in the project channel"
                    size="sm"
                    disabled={discussing}
                    onClick={() => {
                      setDiscussing(true);
                      void discussTask(task.id).then((result) => {
                        setDiscussing(false);
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        // Straight into the channel: posting and then
                        // being left on the task is a dead end.
                        onClose();
                        router.push(`${pathname}?view=chat`);
                      });
                    }}
                  >
                    <MessageSquarePlus className="size-4" />
                  </IconButton>
                  <IconButton
                    label={task.starred ? "Remove from starred" : "Star task"}
                    size="sm"
                    onClick={() => store.toggleStar(task.id)}
                  >
                    <Star
                      className={cn("size-4", task.starred && "fill-warning text-warning")}
                    />
                  </IconButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label="Task options" size="sm">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[60] w-52">
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
              <DialogTitle asChild>
                <TaskTitle key={task.id} id={task.id} title={task.title} />
              </DialogTitle>
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
                  {/* Read-only: a task moves between projects, not
                      between spaces on its own — the project it belongs
                      to decides its space. Shown because "which part of
                      the workspace is this?" is the first thing somebody
                      opening a task from search needs to know. */}
                  <Field label="Space">
                    <Link
                      href={`/spaces/${project.spaceSlug}`}
                      className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-body-sm
                                 text-text-primary transition-colors hover:bg-white/5
                                 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold ring-1 ring-inset",
                          SPACE_COLOR[project.spaceColor].chip,
                          SPACE_COLOR[project.spaceColor].text
                        )}
                        aria-hidden="true"
                      >
                        {project.spaceName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate">{project.spaceName}</span>
                    </Link>
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
      </DialogContent>
    </Dialog>
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
