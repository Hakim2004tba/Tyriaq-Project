import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { UsersTable } from "./users-table";
import { getAdminUsers } from "@/lib/data/admin";

export const metadata = { title: "Users" };

export default async function AdminUsersPage(): Promise<JSX.Element> {
  const users = await getAdminUsers();

  return (
    <AdminPage>
      <PageHeader
        title="Users"
        subtitle={`${users?.length ?? 0} ${
          (users?.length ?? 0) === 1 ? "account" : "accounts"
        } across every workspace`}
      />
      {/*
        The note appears only when there is nothing real to show. Leaving
        it above real data is how staff learn to ignore warnings.
      */}
      {!users && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so accounts cannot be read from here.
        </SampleDataNote>
      )}
      <UsersTable users={users ?? []} />
    </AdminPage>
  );
}
