import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { WorkspacesTable } from "./workspaces-table";
import { WORKSPACES } from "@/lib/data/admin-sample";

export const metadata = { title: "Workspaces" };

export default function AdminWorkspacesPage(): JSX.Element {
  const active = WORKSPACES.filter((w) => w.status !== "archived").length;
  return (
    <AdminPage>
      <PageHeader
        title="Workspaces"
        subtitle={`${active} active, ${WORKSPACES.length - active} archived`}
      />
      <SampleDataNote />
      <WorkspacesTable workspaces={WORKSPACES} />
    </AdminPage>
  );
}
