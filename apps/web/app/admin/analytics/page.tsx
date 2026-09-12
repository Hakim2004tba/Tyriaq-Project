import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { AnalyticsCharts } from "./analytics-charts";

export const metadata = { title: "Usage & analytics" };

export default function AdminAnalyticsPage(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader title="Usage & analytics" subtitle="Where the platform's load and revenue come from" />
      <SampleDataNote />
      <AnalyticsCharts />
    </AdminPage>
  );
}
