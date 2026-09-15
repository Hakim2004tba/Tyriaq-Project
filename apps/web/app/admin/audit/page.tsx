import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { AuditTable } from "./audit-table";
import { getAdminAudit } from "@/lib/data/admin";

export const metadata = { title: "Audit log" };

export default async function AdminAuditPage(): Promise<JSX.Element> {
  const entries = await getAdminAudit();

  return (
    <AdminPage>
      <PageHeader
        title="Audit log"
        subtitle="Every administrative action, who took it, and whether it succeeded"
      />
      {/*
        The trail is append-only by construction: `admin_audit` has a
        select policy and nothing else, so no session can write, edit or
        delete a row. Entries are written by the functions that perform
        the actions — an audit trail an administrator can edit is not an
        audit trail.
      */}
      {(entries ?? []).length === 0 && (
        <SampleDataNote>
          Nothing has been recorded yet. Entries appear here as staff act — changing a plan,
          suspending an account, replying to a ticket.
        </SampleDataNote>
      )}
      <AuditTable entries={entries ?? []} />
    </AdminPage>
  );
}
