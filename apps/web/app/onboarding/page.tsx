import type { JSX } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, getWorkspaces, requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function OnboardingPage(): Promise<JSX.Element> {
  const user = await requireUser();

  // Someone who already has a workspace has no business here — send them
  // in rather than letting them create a second one by accident.
  const workspaces = await getWorkspaces();
  if (workspaces.length > 0) redirect("/dashboard");

  const profile = await getProfile();
  return <OnboardingForm email={user.email ?? ""} fullName={profile?.fullName ?? ""} />;
}
