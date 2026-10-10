import { requireSession } from "@/lib/auth/session";
import { RoleWorkspace } from "@/components/dashboard/role-workspace";
import { AdminOverview } from "@/components/dashboard/admin/admin-overview";
import { CommercialOverview } from "@/components/dashboard/commercial/commercial-overview";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireSession();

  if (user.role === "admin") {
    const rawSearchParams = await searchParams;
    return <AdminOverview user={user} rawSearchParams={rawSearchParams} />;
  }

  if (user.role === "commercial") {
    return <CommercialOverview user={user} />;
  }

  return <RoleWorkspace user={user} />;
}
