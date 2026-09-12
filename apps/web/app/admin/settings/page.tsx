import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader title="Settings" subtitle="How the platform behaves for everybody on it" />
      <SampleDataNote />
      <SettingsForm />
    </AdminPage>
  );
}
