import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { SupportTable } from "./support-table";
import { TICKETS } from "@/lib/data/admin-sample";

export const metadata = { title: "Support" };

export default function AdminSupportPage(): JSX.Element {
  const open = TICKETS.filter((t) => t.status !== "resolved").length;
  return (
    <AdminPage>
      <PageHeader title="Support" subtitle={`${open} open, ${TICKETS.length - open} resolved`} />
      <SampleDataNote />
      <SupportTable tickets={TICKETS} />
    </AdminPage>
  );
}
