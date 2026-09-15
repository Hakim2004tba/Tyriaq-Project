import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";
import { getPlatformSettings } from "@/lib/data/admin";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage(): Promise<JSX.Element> {
  const settings = await getPlatformSettings();

  return (
    <AdminPage>
      <PageHeader title="Settings" subtitle="How the platform behaves for everybody on it" />
      {!settings && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so settings cannot be read or saved.
        </SampleDataNote>
      )}
      <SettingsForm
        settings={settings ?? { signupsOpen: true, supportEmail: "", announcement: "" }}
        disabled={!settings}
      />
    </AdminPage>
  );
}
