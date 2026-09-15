import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { SupportTable } from "./support-table";
import { getAdminTickets } from "@/lib/data/admin";

export const metadata = { title: "Support" };

export default async function AdminSupportPage(): Promise<JSX.Element> {
  const tickets = await getAdminTickets();
  const rows = tickets ?? [];
  const open = rows.filter((row) => row.status !== "resolved").length;

  return (
    <AdminPage>
      <PageHeader
        title="Support"
        subtitle={
          rows.length === 0 ? "No tickets yet" : `${open} open, ${rows.length - open} resolved`
        }
      />
      {!tickets && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so tickets cannot be read from here.
        </SampleDataNote>
      )}
      <SupportTable tickets={rows} />
    </AdminPage>
  );
}
