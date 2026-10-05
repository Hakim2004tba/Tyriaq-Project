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
import { getFieldValues, getProjectFields } from "@/lib/data/custom-fields";
import { getProjectStatuses, getSavedViews } from "@/lib/data/board";
import { getAutomations } from "@/lib/data/automations";
import { getProjectScoring } from "@/lib/data/scoring";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const { period } = await searchParams;
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
  const [customFields, fieldValues, statuses, savedViews, automations] = await Promise.all([
    getProjectFields(project.id),
    getFieldValues(tasks.map((t) => t.id)),
    getProjectStatuses(project.id),
    getSavedViews(project.id),
    getAutomations(project.id),
  ]);

  /*
    Scoring is read after the members, because a leaderboard is a list
    of ids until somebody puts names and faces to them — and the people
    are already loaded for every other part of this page.
  */
  const scoring = await getProjectScoring(
    project.id,
    period === "all"
      ? null
      : new Date(Date.now() - (period === "week" ? 7 : 30) * 86400000).toISOString(),
    workspaceMembers.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))
  );
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
      customFields={customFields}
      fieldValues={fieldValues}
      statuses={statuses}
      savedViews={savedViews}
      automations={automations}
      scoring={scoring}
      period={period === "week" || period === "all" ? period : "month"}
      canManage={workspace?.role === "owner" || workspace?.role === "admin"}
      currentUser={{ id: user?.id ?? "", name: profile?.fullName || "You" }}
    />
  );
}
