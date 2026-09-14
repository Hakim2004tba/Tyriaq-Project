"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "@flow/ui";
import {
  deleteComment as deleteCommentAction,
  editComment as editCommentAction,
  logTime as logTimeAction,
  postComment as postCommentAction,
  removeAttachment as removeAttachmentAction,
  signAttachment,
  recordAttachment,
} from "@/lib/actions/collaboration";
import {
  createTask as createTaskAction,
  deleteTask as deleteTaskAction,
  moveTask as moveTaskAction,
  setTaskAssignee,
  setTaskDependency,
  setTaskStarred,
  updateTask as updateTaskAction,
} from "@/lib/actions/task";
import { createClient } from "@/lib/supabase/client";
import {
  attachmentKind,
  emptyDetail,
  formatBytes,
  formatRelative,
  mentionedIds,
  type Person,
  type ProjectTask,
  type TaskActivityEntry,
  type TaskAttachment,
  type TaskComment,
  type TaskDetail,
  type TaskStatus,
} from "@/lib/data/task-types";

/**
 * Task state for the project workspace and the workspace calendar.
 *
 * One store behind all four views is what makes "the same task
 * everywhere" structurally true: dragging a card on the board and
 * ticking a subtask in the panel are edits to the same record, so the
 * list behind the panel is already correct when it closes.
 *
 * Every mutation is OPTIMISTIC. The local state changes first, the
 * request follows, and a failure restores the exact snapshot taken
 * before the change and says what went wrong. That ordering is what
 * makes a drag feel like moving an object rather than submitting a
 * form — a Kanban drop that waited for a round trip would snap back
 * under the cursor on every slow connection.
 *
 * Comments, attachments and time entries are the exception: they have no
 * tables in this phase, so they live for the session only. They are not
 * written anywhere and will not survive a reload.
 */

export interface TaskStore {
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
  /**
   * Tasks WITHOUT a parent.
   *
   * What the list, board, calendar and timeline each show. A subtask is
   * a task — same table, same fields — but it belongs to its parent's
   * checklist, and repeating it as a row of its own makes one piece of
   * work look like two and double-counts every progress bar on the page.
   */
  topLevel: ProjectTask[];
  /** Ordering within a status group, by task id. */
  orderOf: (status: TaskStatus) => ProjectTask[];
  getTask: (id: string) => ProjectTask | undefined;
  getDetail: (id: string) => TaskDetail | undefined;

  setStatus: (id: string, status: TaskStatus) => void;
  /** Move `id` into `status`, positioned before `beforeId` (or last). */
  moveTask: (id: string, status: TaskStatus, beforeId: string | null) => void;
  /** Reposition without touching status — for boards grouped by
   * assignee, priority or tag, where the column is not the status. */
  reorderTask: (id: string, beforeId: string | null) => void;
  updateTask: (id: string, patch: Partial<ProjectTask>) => void;
  /** `patch` lets a caller place the new task — the calendar uses it to
   * set the due date to the day that was clicked. */
  addTask: (status: TaskStatus, title: string, patch?: Partial<ProjectTask>) => string;
  deleteTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  setDescription: (taskId: string, description: string) => void;
  addComment: (taskId: string, body: string) => void;
  editComment: (taskId: string, commentId: string, body: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  attachFile: (taskId: string, file: File) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;
  /** Opens a file in a new tab, or saves it — via a URL minted per click. */
  openAttachment: (attachmentId: string, download: boolean) => void;
  logTime: (taskId: string, minutes: number, note: string) => void;
  toggleTag: (taskId: string, tag: string) => void;
  /** Personal bookmark; nobody else's view changes. */
  toggleStar: (taskId: string) => void;
  /** `source` blocks `target`. Refuses self-links, duplicates and any
   * edge that would close a cycle. Returns why it refused, or null. */
  addDependency: (sourceId: string, targetId: string) => string | null;
  removeDependency: (sourceId: string, targetId: string) => void;
  toggleAssignee: (taskId: string, personId: string) => void;
  /** Everyone who can be put on a task, or mentioned in a comment. */
  people: Person[];
}

const Ctx = createContext<TaskStore | null>(null);

export function useTasks(): TaskStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTasks must be used inside <TaskStoreProvider>");
  return v;
}

/**
 * Applies a change to every task's detail.
 *
 * Realtime DELETE payloads carry only the primary key — by design, so a
 * deleted comment's body is not broadcast to everyone — which means the
 * task it belonged to is unknown and the removal has to be applied
 * wherever the id turns up.
 */
function mapDetails(
  prev: Record<string, TaskDetail>,
  fn: (d: TaskDetail) => TaskDetail
): Record<string, TaskDetail> {
  const next: Record<string, TaskDetail> = {};
  for (const [id, detail] of Object.entries(prev)) next[id] = fn(detail);
  return next;
}

/**
 * Keeps the first row of each id.
 *
 * The local copy is kept over the broadcast one because it is the row
 * already on screen — replacing it would make the comment flicker out
 * and back at the moment it is confirmed.
 */
function dedupe<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

interface Snapshot {
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
}

/**
 * Seeded with a task LIST rather than a project, so the same store backs
 * a single project's views and the workspace-wide calendar, which spans
 * every project at once.
 */
export function TaskStoreProvider({
  tasks: seed,
  details: seedDetails,
  people,
  projectId,
  workspaceId,
  currentUser,
  children,
}: {
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
  people: Person[];
  /** Scopes the realtime channel; collaboration rows all carry it. */
  workspaceId: string | null;
  /** Where `addTask` puts a new task; the calendar passes the project of
   * the day it was created in. */
  projectId: string | null;
  currentUser: Person;
  children: ReactNode;
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>(seed);
  const [details, setDetails] = useState<Record<string, TaskDetail>>(seedDetails);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const detailsRef = useRef(details);
  detailsRef.current = details;

  /**
   * Requests still in flight.
   *
   * Server data arriving mid-flight — a `revalidatePath` from this very
   * store, or another view refreshing — must not overwrite an optimistic
   * change that has not been confirmed yet, or the card would jump back
   * to its old column a moment after being dropped.
   */
  const pending = useRef(0);

  useEffect(() => {
    if (pending.current > 0) return;
    setTasks(seed);
    setDetails(seedDetails);
  }, [seed, seedDetails]);

  /**
   * Applies a change locally, then sends it. On failure the exact state
   * from before the change is restored — not a re-derivation of it,
   * which could quietly drop a second edit made while this one was in
   * flight.
   */
  const commit = useCallback(
    (apply: () => void, request: () => Promise<{ error?: string } | void>) => {
      const snapshot: Snapshot = { tasks: tasksRef.current, details: detailsRef.current };
      apply();
      pending.current += 1;
      void request()
        .then((result) => {
          if (result && "error" in result && result.error) {
            setTasks(snapshot.tasks);
            setDetails(snapshot.details);
            toast.error(result.error);
          }
        })
        .catch(() => {
          setTasks(snapshot.tasks);
          setDetails(snapshot.details);
          toast.error("Could not save that change. Check your connection.");
        })
        .finally(() => {
          pending.current -= 1;
        });
    },
    []
  );

  /**
   * Ids this client has already accounted for.
   *
   * Every write is applied optimistically AND comes back over the
   * realtime channel a moment later. Recording the id at the point the
   * server confirms it is what makes the echo a no-op instead of a
   * duplicate comment appearing under the one just posted.
   */
  const seenRef = useRef(new Set<string>());

  const peopleRef = useRef(people);
  peopleRef.current = people;

  /**
   * Collaboration, live.
   *
   * Comments, activity and attachments are subscribed to; tasks are not.
   * Those three are records of what people did, where another person's
   * row appearing under yours is the entire point. A task row is being
   * dragged and typed into locally, and remote patches landing mid-gesture
   * would fight whoever is holding the mouse — their changes still
   * surface here, as activity.
   *
   * The filter is the workspace rather than the task: one channel serves
   * the whole board, so opening a different task does not tear down and
   * rebuild a subscription.
   */
  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createClient();

    const personById = (id: string | null): Person => {
      const found = id ? peopleRef.current.find((p) => p.id === id) : undefined;
      return found ?? { id: id ?? "", name: "Someone" };
    };

    const channel = supabase
      .channel(`tyriaq:workspace:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            setDetails((prev) => mapDetails(prev, (d) => ({
              ...d,
              comments: d.comments.filter((c) => c.id !== id),
            })));
            return;
          }

          const row = payload.new as {
            id: string; task_id: string; author_id: string; body: string;
            mentions: string[] | null; created_at: string; edited_at: string | null;
          };
          // Our own write, already on screen.
          if (seenRef.current.has(row.id)) return;

          const comment: TaskComment = {
            id: row.id,
            author: personById(row.author_id),
            body: row.body,
            time: formatRelative(row.created_at),
            createdAt: row.created_at,
            edited: Boolean(row.edited_at),
            mentions: row.mentions ?? [],
            mine: row.author_id === currentUser.id,
            canDelete: row.author_id === currentUser.id,
          };

          setDetails((prev) => {
            const d = prev[row.task_id];
            if (!d) return prev;
            const existing = d.comments.findIndex((c) => c.id === row.id);
            const comments =
              existing === -1
                ? [...d.comments, comment]
                : d.comments.map((c) => (c.id === row.id ? { ...c, body: comment.body, edited: comment.edited } : c));
            return { ...prev, [row.task_id]: { ...d, comments } };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_activity", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const row = payload.new as {
            id: string; task_id: string; actor_id: string | null;
            kind: TaskActivityEntry["kind"]; text: string; detail: string | null; created_at: string;
          };
          setDetails((prev) => {
            const d = prev[row.task_id];
            if (!d || d.activity.some((a) => a.id === row.id)) return prev;
            return {
              ...prev,
              [row.task_id]: {
                ...d,
                activity: [
                  ...d.activity,
                  {
                    id: row.id,
                    actor: personById(row.actor_id),
                    kind: row.kind,
                    text: row.text,
                    detail: row.detail ?? undefined,
                    time: formatRelative(row.created_at),
                    createdAt: row.created_at,
                  },
                ],
              },
            };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_attachments", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            setDetails((prev) => mapDetails(prev, (d) => ({
              ...d,
              attachments: d.attachments.filter((a) => a.id !== id),
            })));
            return;
          }

          const row = payload.new as {
            id: string; task_id: string; uploaded_by: string; storage_path: string;
            file_name: string; mime_type: string; size_bytes: number; created_at: string;
          };
          if (seenRef.current.has(row.id)) return;

          setDetails((prev) => {
            const d = prev[row.task_id];
            if (!d || d.attachments.some((a) => a.id === row.id)) return prev;
            return {
              ...prev,
              [row.task_id]: {
                ...d,
                attachments: [
                  ...d.attachments,
                  {
                    id: row.id,
                    name: row.file_name,
                    kind: attachmentKind(row.mime_type),
                    size: formatBytes(row.size_bytes),
                    uploadedBy: personById(row.uploaded_by),
                    uploadedAt: formatRelative(row.created_at),
                    storagePath: row.storage_path,
                    mimeType: row.mime_type,
                    canRemove: row.uploaded_by === currentUser.id,
                  },
                ],
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, workspaceId]);

  /** Local-only edit, for the parts of the panel with no table behind them. */
  const patchDetail = useCallback((id: string, fn: (d: TaskDetail) => TaskDetail) => {
    setDetails((prev) => {
      const d = prev[id];
      if (!d) return prev;
      return { ...prev, [id]: fn(d) };
    });
  }, []);

  /**
   * Applies a patch, and keeps a parent's counts honest.
   *
   * A subtask can now be completed from the list without opening its
   * parent, and when it is, the parent's "2/3" and the checklist inside
   * its panel both have to move. They used to be recounted only by the
   * paths that went through the panel, so editing from the list left
   * the row claiming the old number.
   */
  const patchLocal = useCallback((id: string, patch: Partial<ProjectTask>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      const changed = next.find((t) => t.id === id);
      return changed?.parentId && patch.status !== undefined
        ? recountRef.current(next, changed.parentId)
        : next;
    });

    if (patch.status === undefined) return;
    const child = tasksRef.current.find((t) => t.id === id);
    if (!child?.parentId) return;
    const parentId = child.parentId;
    const done = patch.status === "done";
    setDetails((prev) => {
      const detail = prev[parentId];
      if (!detail) return prev;
      return {
        ...prev,
        [parentId]: {
          ...detail,
          subtaskItems: detail.subtaskItems.map((item) =>
            item.id === id ? { ...item, done } : item
          ),
        },
      };
    });
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<ProjectTask>) => {
      commit(
        () => patchLocal(id, patch),
        () =>
          updateTaskAction(id, {
            title: patch.title,
            status: patch.status,
            priority: patch.priority,
            startOffset: patch.startOffset,
            dueOffset: patch.dueOffset,
            tags: patch.tags,
            milestone: patch.milestone,
          })
      );
    },
    [commit, patchLocal]
  );

  const setStatus = useCallback(
    (id: string, status: TaskStatus) => updateTask(id, { status }),
    [updateTask]
  );

  const setDescription = useCallback(
    (taskId: string, description: string) => {
      commit(
        () => patchDetail(taskId, (d) => ({ ...d, description })),
        () => updateTaskAction(taskId, { description })
      );
    },
    [commit, patchDetail]
  );

  /**
   * Reorders the local array and tells the server which two tasks the
   * drop landed between.
   *
   * The neighbours are read from the list AFTER the move, so they are
   * exactly what the user sees; sending a computed position instead
   * would race any other move already in flight.
   */
  const place = useCallback(
    (id: string, status: TaskStatus | null, beforeId: string | null) => {
      const before = tasksRef.current;
      const moving = before.find((t) => t.id === id);
      if (!moving) return;
      const targetStatus = status ?? moving.status;
      // Dropping a task onto itself is a no-op, not a reorder — without
      // this the row briefly detaches and re-inserts, which reads as a flicker.
      if (beforeId === id && targetStatus === moving.status) return;

      const rest = before.filter((t) => t.id !== id);
      const updated = { ...moving, status: targetStatus };

      let next: ProjectTask[];
      if (beforeId === null) {
        // Append to the end of the target group so the drop lands where
        // the placeholder was shown, not at the end of the whole list.
        const lastIdx = rest.reduce((acc, t, i) => (t.status === targetStatus ? i : acc), -1);
        next = lastIdx === -1 ? [...rest, updated] : [...rest.slice(0, lastIdx + 1), updated, ...rest.slice(lastIdx + 1)];
      } else {
        const idx = rest.findIndex((t) => t.id === beforeId);
        next = idx === -1 ? [...rest, updated] : [...rest.slice(0, idx), updated, ...rest.slice(idx)];
      }

      const column = next.filter((t) => t.status === targetStatus && !t.parentId);
      const at = column.findIndex((t) => t.id === id);
      const previousId = at > 0 ? column[at - 1]!.id : null;
      const nextId = at >= 0 && at < column.length - 1 ? column[at + 1]!.id : null;

      commit(
        () => setTasks(next),
        () => moveTaskAction(id, status, previousId, nextId)
      );
    },
    [commit]
  );

  const moveTask = useCallback(
    (id: string, status: TaskStatus, beforeId: string | null) => place(id, status, beforeId),
    [place]
  );

  const reorderTask = useCallback(
    (id: string, beforeId: string | null) => place(id, null, beforeId),
    [place]
  );

  /**
   * Inserts immediately under a temporary id and swaps in the real one
   * when the row comes back, so the card is on screen and typable
   * against while the request is still open.
   */
  const addTask = useCallback(
    (status: TaskStatus, title: string, patch?: Partial<ProjectTask>) => {
      const tempId = `pending-${Math.random().toString(36).slice(2)}`;
      const target = patch?.projectId ?? projectId;
      if (!target) {
        toast.error("Choose a project for this task first.");
        return tempId;
      }

      const task: ProjectTask = {
        id: tempId,
        projectId: target,
        parentId: null,
        title,
        status,
        priority: "medium",
        assignees: [currentUser],
        startOffset: null,
        dueOffset: null,
        tags: [],
        position: Number.MAX_SAFE_INTEGER,
        blocks: [],
        ...patch,
      };

      commit(
        () => {
          setTasks((prev) => {
            const lastIdx = prev.reduce((acc, t, i) => (t.status === status ? i : acc), -1);
            return lastIdx === -1
              ? [...prev, task]
              : [...prev.slice(0, lastIdx + 1), task, ...prev.slice(lastIdx + 1)];
          });
          setDetails((prev) => ({ ...prev, [tempId]: emptyDetail() }));
        },
        async () => {
          const result = await createTaskAction({
            projectId: target,
            title,
            status,
            priority: task.priority,
            startOffset: task.startOffset,
            dueOffset: task.dueOffset,
          });
          if (result.error || !result.id) return result;
          const realId = result.id;
          // Re-key in place rather than refetching: the card keeps its
          // position, and any edit made in the meantime survives.
          setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
          setDetails((prev) => {
            const { [tempId]: temp, ...rest } = prev;
            return { ...rest, [realId]: temp ?? emptyDetail() };
          });
          return {};
        }
      );

      return tempId;
    },
    [commit, currentUser, projectId]
  );

  const deleteTask = useCallback(
    (id: string) => {
      commit(
        () => setTasks((prev) => prev.filter((t) => t.id !== id && t.parentId !== id)),
        () => deleteTaskAction(id)
      );
    },
    [commit]
  );

  /**
   * Subtasks are tasks, so ticking one is a status change on a real row.
   * The parent's `done/total` chip is recomputed from the same children
   * the panel lists, which is why the two can never disagree.
   */
  const recount = useCallback((list: ProjectTask[], parentId: string): ProjectTask[] => {
    const children = list.filter((t) => t.parentId === parentId);
    return list.map((t) =>
      t.id === parentId
        ? {
            ...t,
            subtasks: children.length
              ? { done: children.filter((c) => c.status === "done").length, total: children.length }
              : undefined,
          }
        : t
    );
  }, []);

  /*
    `patchLocal` is declared above `recount` and needs it, so it reads it
    through a ref rather than the whole file being reordered around one
    dependency.
  */
  const recountRef = useRef(recount);
  recountRef.current = recount;

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const child = tasksRef.current.find((t) => t.id === subtaskId);
      const nextStatus: TaskStatus = child?.status === "done" ? "todo" : "done";

      commit(
        () => {
          setTasks((prev) =>
            recount(
              prev.map((t) => (t.id === subtaskId ? { ...t, status: nextStatus } : t)),
              taskId
            )
          );
          setDetails((prev) => {
            const d = prev[taskId];
            if (!d) return prev;
            return {
              ...prev,
              [taskId]: {
                ...d,
                subtaskItems: d.subtaskItems.map((s) =>
                  s.id === subtaskId ? { ...s, done: nextStatus === "done" } : s
                ),
              },
            };
          });
        },
        () => updateTaskAction(subtaskId, { status: nextStatus })
      );
    },
    [commit, recount]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const parent = tasksRef.current.find((t) => t.id === taskId);
      if (!parent) return;
      const tempId = `pending-${Math.random().toString(36).slice(2)}`;

      commit(
        () => {
          setTasks((prev) =>
            recount(
              [
                ...prev,
                {
                  id: tempId,
                  projectId: parent.projectId,
                  parentId: taskId,
                  title,
                  status: "todo",
                  priority: "medium",
                  assignees: [],
                  startOffset: null,
                  dueOffset: null,
                  tags: [],
                  position: Number.MAX_SAFE_INTEGER,
                  blocks: [],
                },
              ],
              taskId
            )
          );
          setDetails((prev) => {
            const d = prev[taskId];
            if (!d) return prev;
            return {
              ...prev,
              [taskId]: { ...d, subtaskItems: [...d.subtaskItems, { id: tempId, title, done: false }] },
            };
          });
        },
        async () => {
          const result = await createTaskAction({
            projectId: parent.projectId,
            title,
            parentId: taskId,
          });
          if (result.error || !result.id) return result;
          const realId = result.id;
          setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
          setDetails((prev) => {
            const d = prev[taskId];
            if (!d) return prev;
            return {
              ...prev,
              [taskId]: {
                ...d,
                subtaskItems: d.subtaskItems.map((s) => (s.id === tempId ? { ...s, id: realId } : s)),
              },
            };
          });
          return {};
        }
      );
    },
    [commit, recount]
  );

  const toggleStar = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      const next = !task.starred;
      commit(
        () => patchLocal(taskId, { starred: next }),
        () => setTaskStarred(taskId, next)
      );
    },
    [commit, patchLocal]
  );

  const toggleTag = useCallback(
    (taskId: string, tag: string) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      const current = task.tags ?? [];
      const tags = current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag];
      commit(
        () => patchLocal(taskId, { tags }),
        () => updateTaskAction(taskId, { tags })
      );
    },
    [commit, patchLocal]
  );

  /**
   * Dependency edges are held on the SOURCE as `blocks`, so "what does
   * this block" is a field read and "what blocks this" is a scan. The
   * cycle guard walks forward from the proposed target: if it can reach
   * the source, the new edge would close a loop and no schedule could
   * satisfy it. The database enforces the same rule — this copy exists
   * so the refusal appears instantly under the cursor rather than after
   * a round trip.
   */
  const addDependency = useCallback(
    (sourceId: string, targetId: string): string | null => {
      if (sourceId === targetId) return "A task cannot block itself.";
      const list = tasksRef.current;
      const source = list.find((t) => t.id === sourceId);
      if (!source) return "That task no longer exists.";
      if ((source.blocks ?? []).includes(targetId)) return "That dependency already exists.";

      const edges = new Map(list.map((t) => [t.id, t.blocks ?? []]));
      const seen = new Set<string>();
      const queue = [targetId];
      while (queue.length) {
        const id = queue.shift()!;
        if (id === sourceId) return "That would create a circular dependency.";
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push(...(edges.get(id) ?? []));
      }

      commit(
        () => patchLocal(sourceId, { blocks: [...(source.blocks ?? []), targetId] }),
        () => setTaskDependency(sourceId, targetId, true)
      );
      return null;
    },
    [commit, patchLocal]
  );

  const removeDependency = useCallback(
    (sourceId: string, targetId: string) => {
      const source = tasksRef.current.find((t) => t.id === sourceId);
      if (!source) return;
      commit(
        () => patchLocal(sourceId, { blocks: (source.blocks ?? []).filter((id) => id !== targetId) }),
        () => setTaskDependency(sourceId, targetId, false)
      );
    },
    [commit, patchLocal]
  );

  const toggleAssignee = useCallback(
    (taskId: string, personId: string) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      const person = people.find((p) => p.id === personId);
      if (!task || !person) return;
      const has = task.assignees.some((a) => a.id === personId);

      commit(
        () =>
          patchLocal(taskId, {
            assignees: has ? task.assignees.filter((a) => a.id !== personId) : [...task.assignees, person],
          }),
        () => setTaskAssignee(taskId, personId, !has)
      );
    },
    [commit, patchLocal, people]
  );

  /* Session-only: no tables behind these yet. */

  const addComment = useCallback(
    (taskId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      const tempId = `pending-${Math.random().toString(36).slice(2)}`;
      const mentions = mentionedIds(text, people);
      const now = new Date().toISOString();

      const optimistic: TaskComment = {
        id: tempId,
        author: currentUser,
        body: text,
        time: "just now",
        createdAt: now,
        edited: false,
        mentions,
        mine: true,
        canDelete: true,
        pending: true,
      };

      commit(
        () => {
          patchDetail(taskId, (d) => ({ ...d, comments: [...d.comments, optimistic] }));
          setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, comments: (t.comments ?? 0) + 1 } : t)));
        },
        async () => {
          const result = await postCommentAction(taskId, text, mentions);
          if (result.error || !result.id) return result;
          const { id, createdAt } = result;
          // Swap the temporary id for the real one in place. The realtime
          // echo of this same insert is ignored once the id is known,
          // which is what stops the comment appearing twice.
          seenRef.current.add(id);
          patchDetail(taskId, (d) => ({
            ...d,
            // The realtime echo can beat this response back, in which
            // case the comment is already in the list under its real id
            // and the local one would become a second copy of it.
            comments: dedupe(
              d.comments.map((c) =>
                c.id === tempId
                  ? { ...c, id, pending: false, createdAt: createdAt ?? c.createdAt }
                  : c
              )
            ),
          }));
          return {};
        }
      );
    },
    [commit, currentUser, patchDetail, people]
  );

  const editComment = useCallback(
    (taskId: string, commentId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      commit(
        () =>
          patchDetail(taskId, (d) => ({
            ...d,
            comments: d.comments.map((c) =>
              c.id === commentId ? { ...c, body: text, edited: true } : c
            ),
          })),
        () => editCommentAction(commentId, text)
      );
    },
    [commit, patchDetail]
  );

  const deleteComment = useCallback(
    (taskId: string, commentId: string) => {
      commit(
        () => {
          patchDetail(taskId, (d) => ({
            ...d,
            comments: d.comments.filter((c) => c.id !== commentId),
          }));
          setTasks((ts) =>
            ts.map((t) =>
              t.id === taskId ? { ...t, comments: Math.max(0, (t.comments ?? 1) - 1) } : t
            )
          );
        },
        () => deleteCommentAction(commentId)
      );
    },
    [commit, patchDetail]
  );

  /**
   * Attaching shows the file immediately, greyed, while the bytes are
   * still going up. The optimistic row carries the real name and size —
   * everything except an id it can be opened by, which is why it is not
   * clickable until the upload lands.
   */
  const attachFile = useCallback(
    (taskId: string, file: File) => {
      const tempId = `pending-${Math.random().toString(36).slice(2)}`;
      const optimistic: TaskAttachment = {
        id: tempId,
        name: file.name,
        kind: attachmentKind(file.type || ""),
        size: formatBytes(file.size),
        uploadedBy: currentUser,
        uploadedAt: "uploading…",
        storagePath: "",
        mimeType: file.type || "application/octet-stream",
        canRemove: true,
        pending: true,
      };

      commit(
        () => {
          patchDetail(taskId, (d) => ({ ...d, attachments: [...d.attachments, optimistic] }));
          setTasks((ts) =>
            ts.map((t) => (t.id === taskId ? { ...t, attachments: (t.attachments ?? 0) + 1 } : t))
          );
        },
        async () => {
          if (!workspaceId) return { error: "No workspace selected." };

          /*
            Straight from the browser into the bucket.

            The path leads with the workspace because that is what the
            storage policies read to decide access, and the file name is
            a uuid so two people uploading "final.pdf" cannot collide and
            no name has to be escaped into a path. The row's trigger
            refuses any path that does not match this task, so nothing
            here is taken on trust.
          */
          const extension = file.name.includes(".")
            ? `.${file.name.split(".").pop()!.slice(0, 12)}`
            : "";
          const path = `${workspaceId}/${taskId}/${crypto.randomUUID()}${extension}`;

          const supabase = createClient();
          const { error: uploadError } = await supabase.storage
            .from("task-files")
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (uploadError) return { error: uploadError.message };

          const result = await recordAttachment({
            taskId,
            storagePath: path,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });
          if (result.error || !result.id) {
            // The row is what makes a file an attachment; without it the
            // object is invisible, so it is taken back out rather than
            // left in the bucket forever.
            await supabase.storage.from("task-files").remove([path]);
            return result;
          }
          const id = result.id;
          seenRef.current.add(id);
          patchDetail(taskId, (d) => ({
            ...d,
            // Same race as a comment: the broadcast may already have
            // added this file under its real id.
            attachments: dedupe(
              d.attachments.map((a) =>
                a.id === tempId ? { ...a, id, uploadedAt: "just now", pending: false } : a
              )
            ),
          }));
          return {};
        }
      );
    },
    [commit, currentUser, patchDetail, workspaceId]
  );

  const removeAttachment = useCallback(
    (taskId: string, attachmentId: string) => {
      commit(
        () => {
          patchDetail(taskId, (d) => ({
            ...d,
            attachments: d.attachments.filter((a) => a.id !== attachmentId),
          }));
          setTasks((ts) =>
            ts.map((t) =>
              t.id === taskId ? { ...t, attachments: Math.max(0, (t.attachments ?? 1) - 1) } : t
            )
          );
        },
        () => removeAttachmentAction(attachmentId)
      );
    },
    [commit, patchDetail]
  );

  /**
   * The URL is fetched on the click that uses it and never stored.
   *
   * `window.open` is called first, before awaiting, because a popup
   * opened after an await is no longer attributable to the click and
   * gets blocked; the tab is pointed at the URL once it arrives.
   */
  const openAttachment = useCallback((attachmentId: string, download: boolean) => {
    const tab = download ? null : window.open("", "_blank", "noopener,noreferrer");
    void signAttachment(attachmentId, download).then((result) => {
      if (result.error || !result.url) {
        tab?.close();
        toast.error(result.error ?? "Could not open that file.");
        return;
      }
      if (tab) {
        tab.location.href = result.url;
        return;
      }
      // A download URL carries its own Content-Disposition, so following
      // it in place saves the file without leaving the panel.
      window.location.href = result.url;
    });
  }, []);

  /**
   * Logging time now writes a row.
   *
   * It used to be session-only, like comments once were; reports asked
   * for real hours, so the entry is persisted and shows up in the task's
   * history and in "time by project" without a second copy anywhere.
   */
  const logTime = useCallback(
    (taskId: string, minutes: number, note: string) => {
      const entry = {
        id: `pending-${Math.random().toString(36).slice(2)}`,
        person: currentUser,
        minutes,
        note: note || "Untitled entry",
        when: "just now",
      };

      commit(
        () => patchDetail(taskId, (d) => ({ ...d, timeEntries: [...d.timeEntries, entry] })),
        async () => {
          const result = await logTimeAction(taskId, minutes, note);
          if (result.error || !result.id) return result;
          const realId = result.id;
          patchDetail(taskId, (d) => ({
            ...d,
            timeEntries: d.timeEntries.map((e) => (e.id === entry.id ? { ...e, id: realId } : e)),
          }));
          return {};
        }
      );
    },
    [commit, currentUser, patchDetail]
  );

  const value = useMemo<TaskStore>(
    () => ({
      tasks,
      topLevel: tasks.filter((t) => !t.parentId),
      details,
      people,
      orderOf: (status) => tasks.filter((t) => t.status === status && !t.parentId),
      getTask: (id) => tasks.find((t) => t.id === id),
      getDetail: (id) => details[id],
      setStatus,
      moveTask,
      reorderTask,
      updateTask,
      addTask,
      deleteTask,
      toggleSubtask,
      addSubtask,
      setDescription,
      addComment,
      editComment,
      deleteComment,
      attachFile,
      removeAttachment,
      openAttachment,
      logTime,
      toggleTag,
      toggleStar,
      toggleAssignee,
      addDependency,
      removeDependency,
    }),
    [tasks, details, people, setStatus, moveTask, reorderTask, updateTask, addTask, deleteTask, toggleSubtask, addSubtask, setDescription, addComment, editComment, deleteComment, attachFile, removeAttachment, openAttachment, logTime, toggleTag, toggleStar, toggleAssignee, addDependency, removeDependency]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
