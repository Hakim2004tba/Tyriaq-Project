"use client";

import { CalendarBoard } from "@/components/calendar/calendar-board";
import type { Project } from "@/lib/data/types";

/**
 * A project's Calendar tab.
 *
 * The same component the workspace calendar uses, scoped to one project
 * — so month/week/day, drag-to-reschedule and create-on-a-date behave
 * identically in both places instead of drifting apart as two grids.
 */
export function CalendarView({
  project,
  onOpenTask,
}: {
  project: Project;
  onOpenTask: (id: string) => void;
}) {
  return (
    <CalendarBoard
      projects={[project]}
      projectOf={() => project}
      onOpenTask={onOpenTask}
      onCreateTask={() => {}}
    />
  );
}
