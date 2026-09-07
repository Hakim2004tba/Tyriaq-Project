import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocument, getDocumentFolders, getDocuments } from "@/lib/data/documents";
import { getCurrentWorkspace, getProjects, getWorkspaceMembers } from "@/lib/data/queries";
import { getWorkspaceTasks } from "@/lib/data/tasks";
import { getCurrentUser } from "@/lib/auth/session";
import { DocumentWorkspace } from "./document-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = await getDocument(id);
  return doc ? { title: doc.title } : { title: "Document" };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;

  const [document, folders, documents, projects, members, workspace, user, { tasks }] =
    await Promise.all([
      getDocument(id),
      getDocumentFolders(),
      getDocuments(),
      getProjects(),
      getWorkspaceMembers(),
      getCurrentWorkspace(),
      getCurrentUser(),
      getWorkspaceTasks(),
    ]);

  // A document in another workspace simply is not there as far as RLS is
  // concerned, so "missing" and "forbidden" collapse into one 404.
  if (!document) notFound();

  const isAdmin = workspace?.role === "owner" || workspace?.role === "admin";
  const projectById = new Map(projects.map((p) => [p.id, p]));

  return (
    <DocumentWorkspace
      document={document}
      folders={folders}
      documents={documents}
      projects={projects.filter((p) => !p.archived)}
      people={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      tasks={tasks
        .filter((t) => !t.parentId)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          projectName: projectById.get(t.projectId)?.name ?? null,
          projectSlug: projectById.get(t.projectId)?.slug ?? null,
        }))}
      canDelete={document.createdById === user?.id || Boolean(isAdmin)}
    />
  );
}
