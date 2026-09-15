import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { WorkspacesTable } from "./workspaces-table";
import { getAdminWorkspaces } from "@/lib/data/admin";

export const metadata = { title: "Workspaces" };

export default async function AdminWorkspacesPage(): Promise<JSX.Element> {
  const workspaces = await getAdminWorkspaces();
  const rows = workspaces ?? [];
  const overLimit = rows.filter((row) => row.status === "over_limit").length;

  return (
    <AdminPage>
      <PageHeader
        title="Workspaces"
        subtitle={
          overLimit > 0
            ? `${rows.length} total, ${overLimit} over their storage limit`
            : `${rows.length} total`
        }
      />
      {!workspaces && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so workspaces cannot be read from here.
        </SampleDataNote>
      )}
      <WorkspacesTable workspaces={rows} />
    </AdminPage>
  );
}
