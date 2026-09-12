import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { UsersTable } from "./users-table";
import { USERS } from "@/lib/data/admin-sample";

export const metadata = { title: "Users" };

export default function AdminUsersPage(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader title="Users" subtitle={`${USERS.length} accounts across every workspace`} />
      <SampleDataNote />
      <UsersTable users={USERS} />
    </AdminPage>
  );
}
