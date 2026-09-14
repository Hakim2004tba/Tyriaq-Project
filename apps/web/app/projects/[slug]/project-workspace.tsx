"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, GanttChartSquare, KanbanSquare, List, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@flow/ui";
import { TaskPanel } from "@/components/tasks/task-panel/task-panel";
import { TaskStoreProvider } from "@/components/tasks/task-store";
import type { Person, ProjectTask, TaskDetail } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { BoardView } from "./views/board-view";
import { CalendarView } from "./views/calendar-view";
import { GanttView } from "./views/gantt/gantt-view";
import { ChatView } from "./views/chat-view";
import { ListView } from "./views/list-view";

const VIEWS = ["list", "board", "calendar", "gantt", "chat"] as const;
type View = (typeof VIEWS)[number];

const TABS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "gantt", label: "Gantt", icon: GanttChartSquare },
  /*
    Chat sits at the end of the same strip rather than in a side panel.

    A panel would mean choosing between reading the board and reading the
    conversation about it; a tab means the conversation is part of the
    project the same way the board is, reachable by a link
    (`?view=chat`), and it inherits everything the other tabs have —
    this project's tasks in the `#` picker, and a message that can become
    a task on this board without anybody being asked which project.
  */
  { id: "chat", label: "Chat", icon: MessageSquare },
];

function isView(v: string | null): v is View {
  return v !== null && (VIEWS as readonly string[]).includes(v);
}

/**
 * The project's task workspace — four views over ONE set of rows.
 *
 * The store sits above all four, so a card dragged on the board is the
 * same record the list re-sorts and the Gantt re-draws; there is no
 * per-view copy to fall out of step.
 *
 * The active view lives in the URL (`?view=board`) rather than in
 * component state. "Look at the board" is one of the most-shared links
 * in a tool like this, and a view held only in memory cannot be sent to
 * anyone, bookmarked, or survive a refresh.
 *
 * `replace` rather than `push`: switching tabs is not a navigation
 * people expect Back to undo one step at a time — Back should leave the
 * project, not walk backwards through four tabs.
 */
export function ProjectWorkspace({
  project,
  tasks,
  details,
  people,
  workspaceId,
  currentUser,
}: {
  project: Project;
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
  people: Person[];
  workspaceId: string;
  currentUser: Person;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get("view");
  const view: View = isView(raw) ? raw : "list";
  const selectedTask = params.get("task");

  const setView = useCallback(
    (next: string) => {
      const qs = new URLSearchParams(params.toString());
      if (next === "list") qs.delete("view");
      else qs.set("view", next);
      const q = qs.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [params, pathname, router]
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

  // The panel is a dialog, so Radix already traps focus and handles
  // Escape; this only keeps the URL in step when it closes that way.
  useEffect(() => {
    if (!selectedTask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTask(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTask, setTask]);

  return (
    <TaskStoreProvider
      tasks={tasks}
      details={details}
      people={people}
      workspaceId={workspaceId}
      currentUser={currentUser}
      projectId={project.id}
    >
      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-20 -mx-1 border-b border-border bg-background/80 px-1 backdrop-blur-xl">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="w-full overflow-x-auto border-b-0 tq-scroll-none">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.id} value={t.id}>
                    <Icon className="size-4" aria-hidden="true" />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-0 pt-4">
          {view === "list" && <ListView project={project} onOpenTask={setTask} />}
          {view === "board" && <BoardView project={project} onOpenTask={setTask} />}
          {view === "calendar" && <CalendarView project={project} onOpenTask={setTask} />}
          {view === "gantt" && <GanttView project={project} onOpenTask={setTask} />}
          {view === "chat" && (
            <ChatView
              project={project}
              people={people}
              viewer={currentUser}
              onOpenTask={setTask}
            />
          )}
        </div>

        <TaskPanel
          resolveProject={() => project}
          taskId={selectedTask}
          onClose={() => setTask(null)}
          onNavigate={setTask}
        />
      </div>
    </TaskStoreProvider>
  );
}
