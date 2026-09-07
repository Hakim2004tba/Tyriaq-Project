"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  MessageSquare,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Send,
  Square,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Button, IconButton, Progress, Textarea, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import type { ProjectTask } from "@/lib/data/task-types";
import {
  MAX_ATTACHMENT_BYTES,
  formatExact,
  formatMinutes,
  formatRelative,
  splitMentions,
  type TaskActivityEntry,
  type TaskAttachment,
  type TaskDetail,
} from "@/lib/data/task-types";
import { useTasks } from "../task-store";
import { useDraft } from "../use-draft";
import { useNow } from "../use-now";

export function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-body-sm font-semibold text-text-primary">{title}</h3>
        {count !== undefined && <span className="text-caption tabular text-text-muted">{count}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- */

/**
 * Edited in place, saved shortly after typing stops.
 *
 * The field grows with its content rather than scrolling inside a fixed
 * box — a description is read far more often than it is written, and a
 * six-line scroller hides most of what someone came to read.
 */
export function DescriptionSection({ taskId, detail }: { taskId: string; detail: TaskDetail }) {
  const store = useTasks();
  const [draft, setDraft, flush] = useDraft(detail.description, (next) =>
    store.setDescription(taskId, next)
  );

  return (
    <Section title="Description">
      <textarea
        key={taskId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={flush}
        rows={Math.max(3, draft.split("\n").length + 1)}
        placeholder="Add a description…"
        aria-label="Task description"
        className="w-full resize-y rounded-md border border-transparent bg-transparent px-3 py-2 text-body-sm
                   leading-[21px] text-text-secondary transition-colors placeholder:text-text-muted
                   hover:border-border focus-visible:border-border-strong focus-visible:outline-none
                   focus-visible:shadow-focus"
      />
    </Section>
  );
}

/* ---------------------------------------------------------------- */

export function SubtasksSection({ task, detail }: { task: ProjectTask; detail: TaskDetail }) {
  const store = useTasks();
  const [adding, setAdding] = useState(false);
  const done = detail.subtaskItems.filter((s) => s.done).length;
  const total = detail.subtaskItems.length;

  return (
    <Section
      title="Subtasks"
      count={total || undefined}
      action={
        <Button variant="ghost" size="xs" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" />
          Add
        </Button>
      }
    >
      {total > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={(done / total) * 100} label="Subtask progress" className="flex-1" />
          <span className="shrink-0 text-caption tabular text-text-secondary">
            {done}/{total}
          </span>
        </div>
      )}

      <ul className="flex flex-col">
        {detail.subtaskItems.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => store.toggleSubtask(task.id, s.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors
                         duration-fast hover:bg-white/[0.04] focus-visible:outline-none focus-visible:shadow-focus"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-fast",
                  s.done ? "border-success bg-success text-[#052E1B]" : "border-border-strong"
                )}
                aria-hidden="true"
              >
                {s.done && <CheckCircle2 className="size-3" />}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-body-sm",
                  s.done ? "text-text-muted line-through" : "text-text-primary"
                )}
              >
                {s.title}
              </span>
              {s.assignee && <Avatar name={s.assignee.name} size="xs" />}
              <span className="sr-only">{s.done ? "Completed" : "Not completed"}</span>
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <input
          autoFocus
          placeholder="Subtask name, then Enter"
          aria-label="New subtask"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              store.addSubtask(task.id, e.currentTarget.value.trim());
              e.currentTarget.value = "";
            } else if (e.key === "Escape") {
              setAdding(false);
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.value.trim()) store.addSubtask(task.id, e.currentTarget.value.trim());
            setAdding(false);
          }}
          className="h-8 w-full rounded-md border border-primary/60 bg-surface-muted px-3 text-body-sm
                     text-text-primary shadow-focus placeholder:text-text-muted focus-visible:outline-none"
        />
      )}

      {total === 0 && !adding && (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-body-sm text-text-muted">
          Break this down into steps.
        </p>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- */

const FILE_KIND: Record<TaskAttachment["kind"], { icon: LucideIcon; tone: string; label: string }> = {
  pdf: { icon: FileText, tone: "bg-danger-subtle text-danger", label: "PDF" },
  doc: { icon: FileText, tone: "bg-info-subtle text-info", label: "DOC" },
  image: { icon: FileImage, tone: "bg-primary-muted text-primary", label: "IMG" },
  sheet: { icon: FileSpreadsheet, tone: "bg-success-subtle text-success", label: "XLS" },
  video: { icon: FileVideo, tone: "bg-warning-subtle text-warning", label: "MP4" },
  zip: { icon: FileArchive, tone: "bg-surface-elevated text-text-secondary", label: "ZIP" },
};

/**
 * Files on a task.
 *
 * Uploading shows the row immediately, greyed, while the bytes travel;
 * a file somebody else attaches appears over the realtime channel.
 * Opening and saving both go through a URL minted at the moment of the
 * click and valid for a minute — nothing durable is rendered into the
 * page, so a link copied out of the DOM cannot outlive the person's
 * access to the file.
 */
export function AttachmentsSection({ task, detail }: { task: ProjectTask; detail: TaskDetail }) {
  const store = useTasks();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function accept(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is over the 25 MB limit.`);
        continue;
      }
      store.attachFile(task.id, file);
    }
  }

  return (
    <Section
      title="Attachments"
      count={detail.attachments.length || undefined}
      action={
        <Button variant="ghost" size="xs" onClick={() => inputRef.current?.click()}>
          <Upload className="size-3.5" />
          Upload
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files);
          // Reset, or picking the same file twice in a row fires nothing.
          e.target.value = "";
        }}
      />

      {detail.attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files);
          }}
          className={cn(
            "w-full rounded-md border border-dashed px-3 py-3 text-left text-body-sm transition-colors",
            dragging ? "border-primary text-text-primary" : "border-border text-text-muted"
          )}
        >
          Drop files here or use Upload.
        </button>
      ) : (
        <ul
          className="flex flex-col gap-1.5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            accept(e.dataTransfer.files);
          }}
        >
          {detail.attachments.map((f) => {
            const k = FILE_KIND[f.kind];
            const Icon = k.icon;
            const uploading = f.pending === true;
            return (
              <li
                key={f.id}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md border border-border bg-surface-muted px-2.5 py-2",
                  uploading && "opacity-60"
                )}
              >
                <span
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", k.tone)}
                  aria-hidden="true"
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body-sm text-text-primary">{f.name}</span>
                    <span className="shrink-0 rounded-sm bg-surface-elevated px-1.5 text-[10px] font-semibold text-text-muted">
                      {k.label}
                    </span>
                  </span>
                  <span className="block truncate text-caption tabular text-text-muted">
                    {f.size} · {f.uploadedBy.name.split(" ")[0]} · {f.uploadedAt}
                  </span>
                </span>

                <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity
                                 focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton
                    label={`Preview ${f.name}`}
                    size="sm"
                    disabled={uploading}
                    onClick={() => store.openAttachment(f.id, false)}
                  >
                    <Eye className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Download ${f.name}`}
                    size="sm"
                    disabled={uploading}
                    onClick={() => store.openAttachment(f.id, true)}
                  >
                    <Download className="size-4" />
                  </IconButton>
                  {f.canRemove && (
                    <IconButton
                      label={`Remove ${f.name}`}
                      size="sm"
                      disabled={uploading}
                      onClick={() => store.removeAttachment(task.id, f.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- */

export function TimeSection({ task, detail }: { task: ProjectTask; detail: TaskDetail }) {
  const store = useTasks();
  const now = useNow(1000);
  /**
   * When the timer was started, or null.
   *
   * Held as a timestamp rather than a counter so the elapsed time stays
   * true across a re-render or a backgrounded tab — a tab that stops
   * being painted also stops incrementing a counter, and the entry would
   * come out short.
   */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const running = startedAt !== null;
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.round((now - startedAt) / 60000));
  const logged = detail.timeEntries.reduce((n, e) => n + e.minutes, 0);
  const estimate = detail.estimateMinutes;
  const over = estimate > 0 && logged > estimate;

  return (
    <Section
      title="Time tracking"
      action={
        <Button
          variant={running ? "secondary" : "subtle"}
          size="xs"
          onClick={() => {
            if (startedAt === null) {
              setStartedAt(Date.now());
              return;
            }
            const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
            store.logTime(task.id, minutes, "Timer");
            setStartedAt(null);
          }}
        >
          {running ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? `Stop (${elapsed < 1 ? "<1" : elapsed}m)` : "Start timer"}
        </Button>
      }
    >
      <div className="rounded-md border border-border bg-surface-muted p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-text-muted">Logged</span>
          <span className={cn("text-body-sm font-medium tabular", over ? "text-warning" : "text-text-primary")}>
            {formatMinutes(logged)} {estimate > 0 && <span className="text-text-muted">of {formatMinutes(estimate)}</span>}
          </span>
        </div>
        {estimate > 0 && (
          <Progress
            value={(logged / estimate) * 100}
            tone={over ? "warning" : "brand"}
            label="Time logged against estimate"
            className="mt-2"
          />
        )}
        {running && (
          <p className="mt-2 flex items-center gap-1.5 text-caption text-primary">
            <Clock className="size-3.5" aria-hidden="true" />
            Timer running
          </p>
        )}
      </div>

      {detail.timeEntries.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {detail.timeEntries.map((e) => (
            <li key={e.id} className="flex items-center gap-2.5 px-1">
              <Avatar name={e.person.name} size="xs" />
              <span className="min-w-0 flex-1 truncate text-body-sm text-text-secondary">{e.note}</span>
              <span className="shrink-0 text-caption tabular text-text-muted">{e.when}</span>
              <span className="w-14 shrink-0 text-right text-body-sm tabular text-text-primary">
                {formatMinutes(e.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- */

/**
 * The thread.
 *
 * A comment posts optimistically and appears greyed until it is
 * acknowledged, and another person's comment arrives over the realtime
 * channel without a refresh. Editing and deleting are offered only on
 * rows the viewer could actually change — the policies refuse the rest
 * regardless, so the affordance and the permission agree.
 */
export function CommentsSection({ task, detail }: { task: ProjectTask; detail: TaskDetail }) {
  const store = useTasks();
  const now = useNow();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const ordered = useMemo(
    () =>
      [...detail.comments]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((c) => ({ ...c, time: formatRelative(c.createdAt) })),
    // `now` does not appear in the result — it is the tick that re-derives
    // the labels, without which "just now" would never age.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail.comments, now]
  );

  const matches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return store.people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, store.people]);

  /**
   * Tracks the word being typed after an "@".
   *
   * Read from the text before the caret rather than from the whole
   * value, so mentioning someone in the middle of an already-written
   * paragraph works the same as at the end.
   */
  function onDraftChange(value: string, caret: number) {
    setDraft(value);
    const before = value.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) return setMentionQuery(null);
    const fragment = before.slice(at + 1);
    // A space ends the mention unless a name has two words in it, which
    // is why one space is tolerated and two are not.
    setMentionQuery(/^[^@]{0,40}$/.test(fragment) && fragment.split(" ").length <= 2 ? fragment : null);
  }

  function insertMention(name: string) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) return;
    const next = `${draft.slice(0, at)}@${name} ${draft.slice(caret)}`;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = at + name.length + 2;
      el?.setSelectionRange(pos, pos);
    });
  }

  function post() {
    const body = draft.trim();
    if (!body) return;
    store.addComment(task.id, body);
    setDraft("");
    setMentionQuery(null);
  }

  function saveEdit(id: string) {
    const body = editDraft.trim();
    if (body) store.editComment(task.id, id, body);
    setEditing(null);
  }

  return (
    <Section title="Comments" count={ordered.length || undefined}>
      {ordered.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-body-sm text-text-muted">
          No comments yet — start the thread.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {ordered.map((c) => (
          <li key={c.id} className={cn("group flex gap-2.5", c.pending && "opacity-60")}>
            <Avatar name={c.author.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="truncate text-body-sm font-medium text-text-primary">{c.author.name}</span>
                <span className="shrink-0 text-caption tabular text-text-muted" title={formatExact(c.createdAt)}>
                  {c.pending ? "sending…" : c.time}
                </span>
                {c.edited && <span className="shrink-0 text-caption text-text-muted">· edited</span>}

                {(c.mine || c.canDelete) && !c.pending && (
                  <span className="ml-auto flex shrink-0 gap-0.5 opacity-0 transition-opacity
                                   focus-within:opacity-100 group-hover:opacity-100">
                    {c.mine && (
                      <IconButton
                        label="Edit comment"
                        size="sm"
                        onClick={() => {
                          setEditing(c.id);
                          setEditDraft(c.body);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                    )}
                    {c.canDelete && (
                      <IconButton
                        label="Delete comment"
                        size="sm"
                        onClick={() => store.deleteComment(task.id, c.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )}
                  </span>
                )}
              </p>

              {editing === c.id ? (
                <div className="mt-1.5 flex flex-col gap-2">
                  <Textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(null);
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        saveEdit(c.id);
                      }
                    }}
                    aria-label="Edit comment"
                    className="min-h-[60px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="xs" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button size="xs" onClick={() => saveEdit(c.id)} disabled={!editDraft.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-body-sm leading-[20px] text-text-secondary">
                  {splitMentions(c.body, store.people).map((part, i) =>
                    part.person ? (
                      <span key={i} className="rounded-sm bg-primary-muted px-1 font-medium text-primary">
                        {part.text}
                      </span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    )
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* The composer sits at the bottom of the thread, not the top:
          a comment is a reply to what came before it. */}
      <div className="relative flex flex-col gap-2">
        {matches.length > 0 && (
          <ul
            className="absolute bottom-full z-10 mb-1 w-56 overflow-hidden rounded-md border border-border
                       bg-surface-elevated py-1 shadow-lg"
          >
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => insertMention(p.name)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-body-sm text-text-primary
                             transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/5"
                >
                  <Avatar name={p.name} size="xs" />
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMentionQuery(null);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              post();
            }
          }}
          placeholder="Write a comment… @ to mention, ⌘Enter to send"
          aria-label="Write a comment"
          className="min-h-[68px]"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={post} disabled={!draft.trim()}>
            <Send className="size-3.5" />
            Comment
          </Button>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- */

const ACT_KIND: Record<TaskActivityEntry["kind"], { icon: LucideIcon; tone: string }> = {
  created: { icon: Plus, tone: "bg-primary-muted text-primary" },
  status: { icon: ArrowRightLeft, tone: "bg-surface-elevated text-text-secondary" },
  assigned: { icon: UserPlus, tone: "bg-surface-elevated text-text-secondary" },
  due: { icon: Clock, tone: "bg-warning-subtle text-warning" },
  attached: { icon: Paperclip, tone: "bg-primary-muted text-primary" },
  commented: { icon: MessageSquare, tone: "bg-info-subtle text-info" },
  logged: { icon: Clock, tone: "bg-success-subtle text-success" },
};

/**
 * The history, oldest first.
 *
 * Sorted here rather than trusted from the server: entries arrive from
 * two directions — the initial read and the realtime channel — and a
 * live entry appended to a list that was already ordered would still be
 * in the right place, while one that arrives out of order would not.
 */
export function ActivitySection({ detail }: { detail: TaskDetail }) {
  const now = useNow();
  const entries = useMemo(
    () =>
      [...detail.activity]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((a) => ({ ...a, time: formatRelative(a.createdAt) })),
    // As in the thread above: `now` is the tick, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail.activity, now]
  );

  return (
    <Section title="Activity" count={entries.length}>
      <ul className="flex flex-col">
        {entries.map((a, i) => {
          const k = ACT_KIND[a.kind];
          const Icon = k.icon;
          const last = i === entries.length - 1;
          return (
            <li key={a.id} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", k.tone)}
                  aria-hidden="true"
                >
                  <Icon className="size-3" />
                </span>
                {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
              </div>
              <div className={cn("min-w-0 flex-1", last ? "" : "pb-3.5")}>
                <p className="text-body-sm leading-[18px] text-text-secondary">
                  <span className="font-medium text-text-primary">{a.actor.name.split(" ")[0]}</span> {a.text}
                </p>
                {a.detail && <p className="mt-0.5 text-caption text-text-muted">{a.detail}</p>}
                <p className="mt-0.5 text-caption tabular text-text-muted" title={formatExact(a.createdAt)}>
                  {a.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
