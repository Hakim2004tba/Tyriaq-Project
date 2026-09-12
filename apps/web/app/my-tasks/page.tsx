import type { JSX } from "react";
import type { Metadata } from "next";
import { getCollaboration } from "@/lib/data/collaboration";
import { getCurrentWorkspace, getProjects, getWorkspaceMembers } from "@/lib/data/queries";
import { getWorkspaceTasks } from "@/lib/data/tasks";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { MyTasks } from "./my-tasks";

export const metadata: Metadata = {
  title: "My tasks",
  description: "Everything assigned to you, across every project.",
};

/**
 * Everything assigned to the signed-in person.
 *
 * Cuts across projects, so it reads the workspace-wide task list and
 * narrows it here rather than asking per project. The same task record
 * the board and the list use — opening one here opens the same modal,
 * against the same store.
 */
export default async function MyTasksPage(): Promise<JSX.Element> {
  const [{ tasks, details }, projects, members, workspace, user, profile] = await Promise.all([
    getWorkspaceTasks(),
    getProjects(),
    getWorkspaceMembers(),
    getCurrentWorkspace(),
    getCurrentUser(),
    getProfile(),
  ]);

  const viewerId = user?.id ?? "";
  const mine = tasks.filter(
    (task) => !task.parentId && task.assignees.some((person) => person.id === viewerId)
  );

  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const collaboration = await getCollaboration(mine.map((t) => t.id), viewerId, Boolean(isAdmin));
  for (const task of mine) {
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
    <MyTasks
      tasks={mine}
      details={details}
      projects={projects}
      people={members.map((m) => ({ id: m.id, name: m.name }))}
      workspaceId={workspace?.id ?? null}
      currentUser={{ id: viewerId, name: profile?.fullName || "You" }}
    />
  );
}
