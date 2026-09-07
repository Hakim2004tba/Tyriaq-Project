import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCurrentWorkspace,
  getProject,
  getSpaces,
  getWorkspaceMembers,
} from "@/lib/data/queries";
import { getProjectTasks } from "@/lib/data/tasks";
import { getCollaboration } from "@/lib/data/collaboration";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { ProjectDetail } from "./project-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return project ? { title: project.name, description: project.description } : { title: "Project" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const [project, spaces, workspace, workspaceMembers] = await Promise.all([
    getProject(slug),
    getSpaces(),
    getCurrentWorkspace(),
    getWorkspaceMembers(),
  ]);

  // A project in another workspace is simply not there as far as RLS is
  // concerned, so "missing" and "forbidden" collapse into the same 404.
  if (!project) notFound();

  const [{ tasks, details }, user, profile] = await Promise.all([
    getProjectTasks(project.id),
    getCurrentUser(),
    getProfile(),
  ]);

  /*
    Whether the viewer may moderate — remove somebody else's comment or
    file — decides which buttons are drawn. The policies decide whether
    the write lands; this only avoids offering an action that would be
    refused.
  */
  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const collaboration = await getCollaboration(
    tasks.map((t) => t.id),
    user?.id ?? "",
    Boolean(isAdmin)
  );

  // Description and subtasks come from the task rows; the discussion,
  // history and files come from here. The panel reads one object.
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
    <ProjectDetail
      project={project}
      spaces={spaces.filter((s) => !s.archived)}
      workspaceName={workspace?.name ?? "Workspace"}
      workspaceMembers={workspaceMembers}
      tasks={tasks}
      taskDetails={details}
      workspaceId={project.workspaceId}
      currentUser={{ id: user?.id ?? "", name: profile?.fullName || "You" }}
    />
  );
}
