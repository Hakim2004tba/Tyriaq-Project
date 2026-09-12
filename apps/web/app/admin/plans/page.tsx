import type { JSX } from "react";
import { AdminPage, PageHeader, SampleDataNote } from "@/components/admin/page-header";
import { PlansBoard } from "./plans-board";
import { PLANS } from "@/lib/data/admin-sample";

export const metadata = { title: "Plans" };

export default function AdminPlansPage(): JSX.Element {
  return (
    <AdminPage>
      <PageHeader
        title="Plans"
        subtitle={`${PLANS.length} plans · ${PLANS.reduce((n, p) => n + p.subscribers, 0).toLocaleString()} subscribers`}
      />
      <SampleDataNote />
      <PlansBoard plans={PLANS} />
    </AdminPage>
  );
}
