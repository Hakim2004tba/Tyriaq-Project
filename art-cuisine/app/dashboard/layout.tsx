import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { requireSession } from "@/lib/auth/session";
import { getNotificationsForUser } from "@/lib/data/notifications";
import type { Role } from "@/lib/auth/roles";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireSession();
  const notifications = getNotificationsForUser(user.email).slice(0, 8);

  return (
    <div className="flex min-h-screen w-full bg-surface-sunken">
      <DashboardSidebar role={user.role as Role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar user={user} notifications={notifications} />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
