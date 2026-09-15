import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { AnalyticsCharts } from "./analytics-charts";
import { getAdminOverview, getAdminWorkspaces } from "@/lib/data/admin";

export const metadata = { title: "Usage & analytics" };

export default async function AdminAnalyticsPage(): Promise<JSX.Element> {
  const [overview, workspaces] = await Promise.all([getAdminOverview(), getAdminWorkspaces()]);

  return (
    <AdminPage>
      <PageHeader
        title="Usage & analytics"
        subtitle="Where the platform's load comes from"
      />
      {/*
        There is no revenue chart over time, and that is deliberate: a
        daily revenue line needs a history of what each workspace was
        paying on each day, and the schema keeps only what they pay now.
        MRR is on the overview as a single honest number.
      */}
      {!overview && (
        <SampleDataNote>
          SUPABASE_SERVICE_ROLE_KEY is not set, so nothing here can be measured.
        </SampleDataNote>
      )}
      <AnalyticsCharts
        users={overview?.userSeries ?? []}
        workspacesOverTime={overview?.workspaceSeries ?? []}
        workspaces={workspaces ?? []}
      />
    </AdminPage>
  );
}
