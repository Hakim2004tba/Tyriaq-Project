import type { JSX } from "react";
import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";
import { getReportData } from "@/lib/data/analytics";
import { getProjects, getWorkspaceMembers } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Reports",
  description: "Project and team performance across your workspace.",
};

const ALLOWED_RANGES = new Set(["7", "30", "90", "365"]);

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; project?: string; member?: string }>;
}): Promise<JSX.Element> {
  const { range: rawRange, project, member } = await searchParams;
  const range = ALLOWED_RANGES.has(rawRange ?? "") ? rawRange! : "30";

  /*
    The window ends today and runs back `range` days. Computed on the
    server so every figure on the page is measured against one instant —
    a client clock could put the KPI row and the chart on different days.
  */
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (Number(range) - 1));
  const toIso = today.toISOString().slice(0, 10);
  const fromIso = from.toISOString().slice(0, 10);

  const [data, projects, members] = await Promise.all([
    getReportData({
      from: fromIso,
      to: toIso,
      projectId: project ?? null,
      memberId: member ?? null,
    }),
    getProjects(),
    getWorkspaceMembers(),
  ]);

  return (
    <ReportsView
      data={data}
      projects={projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name }))}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
      range={range}
      projectId={project ?? null}
      memberId={member ?? null}
      from={fromIso}
      to={toIso}
    />
  );
}
