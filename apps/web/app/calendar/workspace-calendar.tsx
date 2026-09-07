"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/calendar-board";
import { TaskPanel } from "@/components/tasks/task-panel/task-panel";
import { TaskStoreProvider } from "@/components/tasks/task-store";
import type { Person, ProjectTask, TaskDetail } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";

/**
 * The workspace-wide calendar.
 *
 * Spans every project, so unlike a project's own views it cannot answer
 * "which project is this task in" with a constant. Each task carries its
 * own `projectId`, which is also what a task created on a given day is
 * filed under — the composer asks for the project before it will save.
 */
export function WorkspaceCalendar({
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedTask = params.get("task");

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const taskProject = useMemo(() => new Map(tasks.map((t) => [t.id, t.projectId])), [tasks]);

  const projectOf = useCallback(
    (taskId: string): Project | undefined => {
      const id = taskProject.get(taskId);
      return id ? byId.get(id) : undefined;
    },
    [byId, taskProject]
  );

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

  return (
    <TaskStoreProvider
      tasks={tasks}
      details={details}
      people={people}
      workspaceId={workspaceId}
      currentUser={currentUser}
      projectId={projects[0]?.id ?? null}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-primary">Calendar</h1>
          <p className="text-body text-text-secondary">
            Every task and deadline across your spaces. Drag a task to reschedule it.
          </p>
        </header>

        <CalendarBoard
          projects={projects}
          projectOf={projectOf}
          onOpenTask={setTask}
          onCreateTask={() => {}}
        />
      </div>

      {projects.length > 0 && (
        <TaskPanel
          resolveProject={(id) => projectOf(id) ?? projects[0]!}
          taskId={selectedTask}
          onClose={() => setTask(null)}
          onNavigate={setTask}
        />
      )}
    </TaskStoreProvider>
  );
}
