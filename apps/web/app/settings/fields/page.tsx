import type { JSX } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getCurrentWorkspace, getProjects } from "@/lib/data/queries";
import { getWorkspaceFields } from "@/lib/data/custom-fields";
import { FieldsScreen } from "./fields-screen";

export const metadata: Metadata = {
  title: "Custom fields",
  description: "The columns your team keeps that Tyriaq did not think of.",
};

export default async function FieldsPage(): Promise<JSX.Element> {
  await requireUser();
  const [fields, projects, workspace] = await Promise.all([
    getWorkspaceFields(),
    getProjects(),
    getCurrentWorkspace(),
  ]);

  return (
    <FieldsScreen
      fields={fields}
      projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }))}
      canManage={workspace?.role === "owner" || workspace?.role === "admin"}
    />
  );
}
