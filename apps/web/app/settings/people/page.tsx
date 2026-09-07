import type { JSX } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PermissionsWorkspace } from "@/components/permissions/permissions-workspace";

export const metadata: Metadata = {
  title: "People & permissions",
  description: "Who can reach what, across spaces and projects.",
};

export default async function PeoplePage(): Promise<JSX.Element> {
  await requireUser();
  return <PermissionsWorkspace />;
}
