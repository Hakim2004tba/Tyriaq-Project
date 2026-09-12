import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { AuditTable } from "./audit-table";
import { AUDIT } from "@/lib/data/admin-sample";

export const metadata = { title: "Audit log" };

export default function AdminAuditPage(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader
        title="Audit log"
        subtitle="Every administrative action, who took it, and whether it succeeded"
      />
      <SampleDataNote>
        Sample data. In the real system this log is append-only and written by the database — an
        audit trail an administrator can edit is not an audit trail.
      </SampleDataNote>
      <AuditTable entries={AUDIT} />
    </AdminPage>
  );
}
