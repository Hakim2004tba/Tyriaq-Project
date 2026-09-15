import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Tyriaq Admin" },
};

/**
 * The back office.
 *
 * Staff only. It was gated on being signed in at all, which was tenable
 * while every page drew sample data — and became a hole the moment one
 * of them read a real subscription, because then every customer could
 * read every other customer's billing.
 *
 * Anybody else gets a 404 rather than a refusal: there is no reason for
 * a customer to learn that this exists.
 */
export default async function AdminLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  await requirePlatformAdmin();
  return <AdminShell>{children}</AdminShell>;
}
