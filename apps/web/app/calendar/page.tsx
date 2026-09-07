import type { JSX } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { EmptyState, SectionCard } from "@flow/ui";
import { getProjects, getWorkspaceMembers } from "@/lib/data/queries";
import { getWorkspaceTasks } from "@/lib/data/tasks";
import { getCollaboration } from "@/lib/data/collaboration";
import { getCurrentWorkspace } from "@/lib/data/queries";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { WorkspaceCalendar } from "./workspace-calendar";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Deadlines across your workspace.",
};

/**
 * Every task the caller can see, across every project — RLS decides
 * what that means, so no workspace filter appears here.
 */
export default async function CalendarPage(): Promise<JSX.Element> {
  const [{ tasks, details }, projects, members, user, workspace] = await Promise.all([
    getWorkspaceTasks(),
    getProjects(),
    getWorkspaceMembers(),
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  if (projects.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header>
          <h1 className="text-h1 text-text-primary">Calendar</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Deadlines across your spaces and projects.
          </p>
        </header>

        <SectionCard title="Nothing to plot yet" subtitle="Create a project first">
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="The calendar needs somewhere to put tasks"
            description="Make a project in one of your spaces, and the work you schedule inside it shows up here."
          />
        </SectionCard>
      </div>
    );
  }

  const profile = user ? await getProfile() : null;
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";

  const collaboration = await getCollaboration(
    tasks.map((t) => t.id),
    user?.id ?? "",
    Boolean(isAdmin)
  );
  for (const task of tasks) {
    const detail = details[task.id];
    if (!detail) continue;
    detail.comments = collaboration.comments[task.id] ?? [];
    detail.activity = collaboration.activity[task.id] ?? [];
    detail.attachments = collaboration.attachments[task.id] ?? [];
    detail.timeEntries = collaboration.timeEntries[task.id] ?? [];
    task.comments = detail.comments.length || undefined;
    task.attachments = detail.attachments.length || undefined;
  }

  return (
    <WorkspaceCalendar
      tasks={tasks.filter((t) => !t.parentId)}
      details={details}
      projects={projects.filter((p) => !p.archived)}
      people={members.map((m) => ({ id: m.id, name: m.name }))}
      workspaceId={workspace?.id ?? null}
      currentUser={{ id: user?.id ?? "", name: profile?.fullName || "You" }}
    />
  );
}
