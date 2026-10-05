"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  GanttChartSquare,
  KanbanSquare,
  List,
  MessageSquare,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@flow/ui";
import { TaskPanel } from "@/components/tasks/task-panel/task-panel";
import { TaskStoreProvider } from "@/components/tasks/task-store";
import type { CustomField, CustomFieldValue } from "@flow/types";
import type { ProjectStatus, SavedView } from "@/lib/data/board";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Person, ProjectTask, TaskDetail } from "@/lib/data/task-types";
import type { Project } from "@/lib/data/types";
import { BoardView } from "./views/board-view";
import { CalendarView } from "./views/calendar-view";
import { GanttView } from "./views/gantt/gantt-view";
import { ChatView } from "./views/chat-view";
import { ScoreboardView, type PeriodId } from "./views/scoreboard-view";
import type { ProjectScoring } from "@/lib/data/scoring-types";
import { ListView } from "./views/list-view";

const VIEWS = ["list", "board", "calendar", "gantt", "chat", "scoreboard"] as const;
type View = (typeof VIEWS)[number];

const TABS: { id: View; label: string; labelKey: MessageKey; icon: LucideIcon }[] = [
  { id: "list", label: "List", labelKey: "view.list", icon: List },
  { id: "board", label: "Board", labelKey: "view.board", icon: KanbanSquare },
  { id: "calendar", label: "Calendar", labelKey: "view.calendar", icon: CalendarDays },
  { id: "gantt", label: "Gantt", labelKey: "view.gantt", icon: GanttChartSquare },
  /*
    Chat sits at the end of the same strip rather than in a side panel.

    A panel would mean choosing between reading the board and reading the
    conversation about it; a tab means the conversation is part of the
    project the same way the board is, reachable by a link
    (`?view=chat`), and it inherits everything the other tabs have —
    this project's tasks in the `#` picker, and a message that can become
    a task on this board without anybody being asked which project.
  */
  { id: "chat", label: "Chat", labelKey: "view.chat", icon: MessageSquare },
  /*
    Last, because it is the one tab that is about the people rather
    than the work — and a scoreboard sitting first would tell a team
    the wrong thing about what this project is for.
  */
  { id: "scoreboard", label: "Scoreboard", labelKey: "view.scoreboard", icon: Trophy },
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
  customFields,
  fieldValues,
  statuses,
  savedViews,
  scoring,
  period,
  canManage,
  currentUser,
}: {
  project: Project;
  tasks: ProjectTask[];
  details: Record<string, TaskDetail>;
  people: Person[];
  workspaceId: string;
  customFields: CustomField[];
  fieldValues: Record<string, Record<string, CustomFieldValue>>;
  statuses: ProjectStatus[];
  savedViews: SavedView[];
  scoring: ProjectScoring;
  period: PeriodId;
  canManage: boolean;
  currentUser: Person;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // `t` is a tab in the map below, so the translator is `tr`.
  const tr = useT();

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
      customFields={customFields}
      fieldValues={fieldValues}
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
                    {tr(t.labelKey)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-0 pt-4">
          {view === "list" && (
            <ListView
              project={project}
              onOpenTask={setTask}
              savedViews={savedViews.filter((saved) => saved.layout === "list")}
              statuses={statuses}
              viewerId={currentUser.id}
            />
          )}
          {view === "board" && <BoardView project={project} onOpenTask={setTask} />}
          {view === "calendar" && <CalendarView project={project} onOpenTask={setTask} />}
          {view === "gantt" && <GanttView project={project} onOpenTask={setTask} />}
          {view === "scoreboard" && (
            <ScoreboardView
              projectId={project.id}
              projectName={project.name}
              scoring={scoring}
              viewerId={currentUser.id}
              canManage={canManage}
              period={period}
              onPeriodChange={(next) => {
                /*
                  The period lives in the URL like the view does, so
                  "look at this month's board" is a link somebody can
                  send rather than a state only they can see.
                */
                const qs = new URLSearchParams(params.toString());
                if (next === "month") qs.delete("period");
                else qs.set("period", next);
                const q = qs.toString();
                router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
              }}
            />
          )}
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
