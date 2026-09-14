import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCurrentWorkspace,
  getProjects,
  getSpace,
  getSpaces,
  getWorkspaceMembers,
} from "@/lib/data/queries";
import { getSpaceMembers } from "@/lib/actions/space-member";
import { listJoinRequests } from "@/lib/actions/space-link";
import { SpaceDetail } from "./space-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  return space ? { title: space.name, description: space.description } : { title: "Space" };
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const [space, spaces, projects, workspace, workspaceMembers] = await Promise.all([
    getSpace(slug),
    getSpaces(),
    getProjects(),
    getCurrentWorkspace(),
    getWorkspaceMembers(),
  ]);

  // RLS makes a space in someone else's workspace simply absent, so a
  // missing row and a forbidden one are the same 404 — which is what we
  // want: an existence check would leak that the slug is taken.
  if (!space) notFound();

  // Read after the space, since both are keyed by its id. The request
  // queue comes back empty for anybody who cannot approve, because the
  // policy behind it answers `can_manage_space`.
  const [memberRows, joinRequests] = await Promise.all([
    getSpaceMembers(space.id),
    listJoinRequests(space.id),
  ]);
  const byId = new Map(workspaceMembers.map((m) => [m.id, m]));

  return (
    <SpaceDetail
      space={space}
      projects={projects.filter((p) => p.spaceId === space.id)}
      spaces={spaces.filter((s) => !s.archived)}
      workspaceName={workspace?.name ?? "Workspace"}
      canDelete={workspace?.role === "owner" || workspace?.role === "admin"}
      workspaceMembers={workspaceMembers}
      canManageMembers={workspace?.role === "owner" || workspace?.role === "admin"}
      joinRequests={joinRequests}
      spaceMembers={memberRows.map((row) => ({
        // A space member who is no longer in the workspace list at all
        // still has to render — the roster row outlives the membership.
        member: byId.get(row.userId) ?? {
          id: row.userId,
          name: row.name,
          email: "",
          avatarUrl: row.avatarUrl,
          workspaceRole: "member" as const,
        },
        level: row.level,
      }))}
    />
  );
}
