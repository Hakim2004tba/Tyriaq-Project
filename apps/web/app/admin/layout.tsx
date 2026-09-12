import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Tyriaq Admin" },
};

/**
 * The back office.
 *
 * Gated on a signed-in user, which is the strongest check available
 * until the platform-admin role exists — this phase is the experience,
 * not the authorisation. Nothing here reads or writes customer data yet,
 * so the gate is a lock on an empty room; it still belongs there, so the
 * route is never simply public.
 */
export default async function AdminLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  await requireUser();
  return <AdminShell>{children}</AdminShell>;
}
