"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { AvatarGroup, Badge, EmptyState, SectionCard } from "@flow/ui";
import { cn } from "@flow/utils";
import { TaskPanel } from "@/components/tasks/task-panel/task-panel";
import { TaskStoreProvider, useTasks } from "@/components/tasks/task-store";
import { Due, Priority as PriorityFlag } from "@/app/projects/[slug]/views/shared";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Person,
  type ProjectTask,
  type TaskDetail,
} from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";

export function MyTasks({
  tasks,
  details,
  projects,
  people,
  workspaceId,
  currentUser,
}: {
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
  projects: Project[];
  people: Person[];
  workspaceId: string | null;
  currentUser: Person;
}) {
  return (
    <TaskStoreProvider
      tasks={tasks}
      details={details}
      people={people}
      workspaceId={workspaceId}
      // Nothing is created from this screen — a task belongs to a
      // project, and "my tasks" is a view across all of them.
      projectId={null}
      currentUser={currentUser}
    >
      <MyTasksBody projects={projects} />
    </TaskStoreProvider>
  );
}

function MyTasksBody({ projects }: { projects: Project[] }) {
  const store = useTasks();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("task");

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const setTask = useCallback(
    (id: string | null) => {
      const qs = new URLSearchParams(params.toString());
      if (id) qs.set("task", id);
      else qs.delete("task");
      const q = qs.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  const open = store.topLevel.filter((t) => t.status !== "done");
  const done = store.topLevel.filter((t) => t.status === "done");

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-h1 text-text-primary">My tasks</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          Everything assigned to you, across every project in this workspace.
        </p>
      </header>

      {store.topLevel.length === 0 ? (
        <SectionCard title="Nothing assigned" subtitle="Yet">
          <EmptyState
            icon={<CircleDashed className="size-5" />}
            title="No tasks are assigned to you"
            description="When somebody puts you on a task — or you take one yourself — it shows up here."
          />
        </SectionCard>
      ) : (
        <>
          {TASK_STATUS_ORDER.filter((status) => status !== "done").map((status) => {
            const rows = open.filter((t) => t.status === status);
            if (rows.length === 0) return null;
            const meta = TASK_STATUS_META[status];

            return (
              <SectionCard
                key={status}
                title={meta.label}
                subtitle={`${rows.length} ${rows.length === 1 ? "task" : "tasks"}`}
              >
                <ul className="flex flex-col divide-y divide-border">
                  {rows.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={byId.get(task.projectId)}
                      onOpen={() => setTask(task.id)}
                    />
                  ))}
                </ul>
              </SectionCard>
            );
          })}

          {done.length > 0 && (
            <SectionCard title="Done" subtitle={`${done.length} finished`}>
              <ul className="flex flex-col divide-y divide-border">
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={byId.get(task.projectId)}
                    onOpen={() => setTask(task.id)}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}

      {/* The same modal the list, board and calendar open. */}
      <TaskPanel
        resolveProject={(id) => {
          const task = store.getTask(id);
          return (task ? byId.get(task.projectId) : undefined) ?? projects[0]!;
        }}
        taskId={selected}
        onClose={() => setTask(null)}
        onNavigate={setTask}
      />
    </div>
  );
}

function TaskRow({
  task,
  project,
  onOpen,
}: {
  task: ProjectTask;
  project: Project | undefined;
  onOpen: () => void;
}) {
  const store = useTasks();
  const done = task.status === "done";

  return (
    <li>
      <div className="group flex items-center gap-3 py-2.5">
        <button
          type="button"
          onClick={() => store.setStatus(task.id, done ? "todo" : "done")}
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className="flex size-5 shrink-0 items-center justify-center rounded-full transition-colors
                     focus-visible:outline-none focus-visible:shadow-focus"
        >
          {done ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <span className="size-4 rounded-full border border-border-strong transition-colors group-hover:border-primary" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span
            className={cn(
              "block truncate text-body-sm",
              done ? "text-text-muted line-through" : "text-text-primary"
            )}
          >
            {task.title}
          </span>
          {project && (
            <span className="block truncate text-caption text-text-muted">
              {project.spaceName} · {project.name}
            </span>
          )}
        </button>

        {task.tags && task.tags.length > 0 && (
          <Badge variant="neutral" size="sm" className="hidden shrink-0 lg:inline-flex">
            {task.tags[0]}
          </Badge>
        )}

        <span className="hidden shrink-0 sm:block">
          <Due offset={task.dueOffset} done={done} />
        </span>

        <span className="hidden shrink-0 md:block">
          <PriorityFlag value={task.priority} compact />
        </span>

        <AvatarGroup
          people={task.assignees.map((a) => ({ id: a.id, name: a.name }))}
          max={2}
          size="xs"
        />
      </div>
    </li>
  );
}
