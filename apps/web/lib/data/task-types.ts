/**
 * The task view model.
 *
 * Every view — list, board, calendar, Gantt, panel — reads this one
 * shape, which is what makes "the same task everywhere" true rather
 * than aspirational: there is a single record per task in the client,
 * and the views are four projections of it.
 *
 * Dates are carried as DAY OFFSETS from `TODAY` rather than as `Date`
 * objects, because every view does arithmetic on them — a Gantt drag is
 * `+3 days`, a calendar drop is "this cell's offset", a list sorts by
 * proximity to now. Offsets keep that arithmetic integer and exact,
 * with no timezone drift midway through a drag. The conversion to and
 * from the `date` columns in Postgres happens once, at the data
 * boundary, in `toISODate` / `offsetFromISO`.
 */

export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";

export interface Person {
  id: string;
  name: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  assignees: Person[];
  /**
   * Days from TODAY — negative is in the past. `null` means the task
   * genuinely has no date, which the views render as such rather than
   * inventing one.
   */
  startOffset: number | null;
  dueOffset: number | null;
  subtasks?: { done: number; total: number };
  comments?: number;
  attachments?: number;
  tags?: string[];
  /** Task ids this one blocks — drawn as Gantt dependency arrows. */
  blocks?: string[];
  /** Marks a Gantt row as a diamond rather than a bar. */
  milestone?: boolean;
  /** Which project it belongs to — the workspace calendar spans several. */
  projectId: string;
  /** Set on subtasks; the top-level views filter these out. */
  parentId: string | null;
  /** Manual ordering within a status column. */
  position: number;
}

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done", "blocked"];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; accent: string }> = {
  todo: { label: "To do", accent: "bg-text-muted" },
  in_progress: { label: "In progress", accent: "bg-primary" },
  review: { label: "In review", accent: "bg-warning" },
  done: { label: "Done", accent: "bg-success" },
  blocked: { label: "Blocked", accent: "bg-danger" },
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/**
 * Local midnight today.
 *
 * Module scope, so every offset in one render is measured against the
 * same instant — a task cannot be "due today" in the list and "due
 * yesterday" in the Gantt because the clock ticked past midnight
 * between two component renders.
 */
export const TODAY = startOfDay(new Date());

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateFromOffset(offset: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offset);
  return d;
}

const MS_PER_DAY = 86_400_000;

/**
 * Postgres `date` columns come back as "YYYY-MM-DD". They are parsed
 * field by field rather than by `new Date(iso)`, which would read the
 * string as UTC midnight and land on the previous day for anyone west
 * of Greenwich — the kind of bug that shifts a whole Gantt by one
 * column for half the world.
 */
export function offsetFromISO(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Math.round((new Date(y, m - 1, d).getTime() - TODAY.getTime()) / MS_PER_DAY);
}

export function toISODate(offset: number | null): string | null {
  if (offset === null || offset === undefined) return null;
  const d = dateFromOffset(offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Today", "Tomorrow", "2 days overdue", "Fri 11 Sep". */
export function formatDue(offset: number | null): string {
  if (offset === null) return "No due date";
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "1 day overdue";
  if (offset < 0) return `${Math.abs(offset)} days overdue`;
  const d = dateFromOffset(offset);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

/**
 * A plain calendar date — "Today", "Yesterday", "Fri 21 Aug".
 *
 * Distinct from `formatDue`, which adds urgency language. A start date
 * in the past is not "14 days overdue", it is simply when the work
 * began, and borrowing the due-date wording says something false.
 */
export function formatDate(offset: number | null): string {
  if (offset === null) return "Not set";
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  const d = dateFromOffset(offset);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export const TODAY_LABEL = `${WEEKDAY[TODAY.getDay()]}, ${TODAY.getDate()} ${MONTH[TODAY.getMonth()]} ${TODAY.getFullYear()}`;

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/* Panel detail                                                        */
/* ------------------------------------------------------------------ */

export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
  assignee?: Person;
}

export interface TaskAttachment {
  id: string;
  name: string;
  kind: "pdf" | "doc" | "image" | "sheet" | "video" | "zip";
  size: string;
  uploadedBy: Person;
  uploadedAt: string;
  /** Path inside the `task-files` bucket; a signed URL is minted from it. */
  storagePath: string;
  mimeType: string;
  /** True when the viewer may remove it — their own file, or admin. */
  canRemove: boolean;
  /** Set while the bytes are still going up. */
  pending?: boolean;
}

export interface TaskComment {
  id: string;
  author: Person;
  body: string;
  /** Relative label — "just now", "4h ago", "21 Aug". */
  time: string;
  /** Exact moment, for the `title` tooltip and for ordering. */
  createdAt: string;
  edited: boolean;
  mentions: string[];
  /** True for the viewer's own comments — they get the edit affordance. */
  mine: boolean;
  canDelete: boolean;
  /** Set while an optimistic comment has not been acknowledged yet. */
  pending?: boolean;
  reactions?: { emoji: string; count: number }[];
}

export interface TaskActivityEntry {
  id: string;
  actor: Person;
  kind: "created" | "status" | "assigned" | "due" | "attached" | "commented" | "logged";
  text: string;
  detail?: string;
  time: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  person: Person;
  minutes: number;
  note: string;
  when: string;
}

export interface TaskDetail {
  description: string;
  subtaskItems: SubtaskItem[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activity: TaskActivityEntry[];
  timeEntries: TimeEntry[];
  estimateMinutes: number;
}

export function emptyDetail(description = ""): TaskDetail {
  return {
    description,
    subtaskItems: [],
    attachments: [],
    comments: [],
    activity: [],
    timeEntries: [],
    estimateMinutes: 0,
  };
}

/** Share of a task's checklist that is complete, or its status otherwise. */
export function taskProgress(task: ProjectTask): number {
  if (task.status === "done") return 100;
  if (task.subtasks && task.subtasks.total > 0) {
    return Math.round((task.subtasks.done / task.subtasks.total) * 100);
  }
  return task.status === "review" ? 75 : task.status === "in_progress" ? 40 : 0;
}

/** "Website Redesign" → "WR" — the two-letter project chip. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Collaboration                                                       */
/* ------------------------------------------------------------------ */

/**
 * "just now", "12m ago", "3h ago", "Fri 21 Aug".
 *
 * Relative only while relative is more useful than absolute — past a
 * week, "37 days ago" makes a reader do arithmetic to recover a date
 * they could simply have been told.
 */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d ago`;

  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

/** The full moment, for a tooltip: "Fri 4 Sep 2026, 14:32". */
export function formatExact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ATTACHMENT_KINDS: [RegExp, TaskAttachment["kind"]][] = [
  [/^image\//, "image"],
  [/^video\//, "video"],
  [/pdf/, "pdf"],
  [/(spreadsheet|excel|csv)/, "sheet"],
  [/(zip|compressed|tar|rar|7z)/, "zip"],
  [/(word|document|text|rtf|presentation)/, "doc"],
];

/** Maps a MIME type onto the six icons the attachment list already has. */
export function attachmentKind(mime: string): TaskAttachment["kind"] {
  const m = mime.toLowerCase();
  for (const [pattern, kind] of ATTACHMENT_KINDS) if (pattern.test(m)) return kind;
  return "doc";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ceiling enforced in three places: the input, the action and the column check. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * Splits a comment body into text and `@mention` runs, matching the
 * longest name first so "@Alice Ait" wins over "@Alice".
 *
 * Mentions are written as display names and resolved back to ids when
 * the comment is posted; this is the reverse trip, for rendering.
 */
export function splitMentions(
  body: string,
  people: Person[]
): { text: string; person?: Person }[] {
  const names = [...people].sort((a, b) => b.name.length - a.name.length);
  const out: { text: string; person?: Person }[] = [];
  let rest = body;

  while (rest.length > 0) {
    const at = rest.indexOf("@");
    if (at === -1) break;

    const after = rest.slice(at + 1);
    const person = names.find((p) => after.toLowerCase().startsWith(p.name.toLowerCase()));
    if (!person) {
      out.push({ text: rest.slice(0, at + 1) });
      rest = rest.slice(at + 1);
      continue;
    }

    if (at > 0) out.push({ text: rest.slice(0, at) });
    out.push({ text: `@${person.name}`, person });
    rest = after.slice(person.name.length);
  }

  if (rest.length > 0) out.push({ text: rest });
  return out;
}

/** Ids of everyone named in a body — what gets stored in `mentions`. */
export function mentionedIds(body: string, people: Person[]): string[] {
  return Array.from(
    new Set(
      splitMentions(body, people)
        .map((part) => part.person?.id)
        .filter((id): id is string => Boolean(id))
    )
  );
}
