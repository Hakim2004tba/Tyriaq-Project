import type { JSX } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getPermissionsOverview } from "@/lib/data/permissions-data";
import { PermissionsLive } from "@/components/permissions/permissions-live";

export const metadata: Metadata = {
  title: "People & permissions",
  description: "Who can reach what, across spaces and projects.",
};

export default async function PeoplePage(): Promise<JSX.Element> {
  await requireUser();
  const overview = await getPermissionsOverview();
  return <PermissionsLive overview={overview} />;
}
