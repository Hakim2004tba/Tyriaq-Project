import type { JSX } from "react";
import type { Metadata } from "next";
import { getCurrentWorkspace, getProjects, getSpaces } from "@/lib/data/queries";
import { ProjectsIndex } from "./projects-index";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every project in your workspace — status, owners and progress.",
};

export default async function ProjectsPage(): Promise<JSX.Element> {
  const [projects, spaces, workspace] = await Promise.all([
    getProjects(),
    getSpaces(),
    getCurrentWorkspace(),
  ]);

  return (
    <ProjectsIndex
      projects={projects}
      spaces={spaces.filter((s) => !s.archived)}
      workspaceName={workspace?.name ?? "your workspace"}
    />
  );
}
