import type { JSX } from "react";
import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getConversations, getMessages } from "@/lib/data/chat";
import { getCurrentWorkspace, getProjects, getWorkspaceMembers } from "@/lib/data/queries";
import { getWorkspaceTasks } from "@/lib/data/tasks";
import { getCurrentUser, getProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Chat",
  description: "Conversations across your workspace.",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}): Promise<JSX.Element> {
  const { c } = await searchParams;

  const [conversations, members, projects, workspace, user, profile, { tasks }] = await Promise.all([
    getConversations(),
    getWorkspaceMembers(),
    getProjects(),
    getCurrentWorkspace(),
    getCurrentUser(),
    getProfile(),
    getWorkspaceTasks(),
  ]);

  // An unknown or unreadable id falls back to the most recent
  // conversation rather than an error page — a stale link in somebody's
  // notes should not be a dead end.
  const active =
    conversations.find((conversation) => conversation.id === c) ?? conversations[0] ?? null;

  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const messages = active
    ? await getMessages(active.id, user?.id ?? "", Boolean(isAdmin))
    : [];

  return (
    <ChatWorkspace
      conversations={conversations}
      activeConversation={active}
      messages={messages}
      context={{
        people: members.map((m) => ({ id: m.id, name: m.name })),
        tasks: tasks
          .filter((t) => !t.parentId)
          .map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            projectSlug: projectById.get(t.projectId)?.slug ?? null,
          })),
        projects: projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug })),
      }}
      projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
      viewer={{ id: user?.id ?? "", name: profile?.fullName || "You" }}
      workspaceId={workspace?.id ?? null}
    />
  );
}
