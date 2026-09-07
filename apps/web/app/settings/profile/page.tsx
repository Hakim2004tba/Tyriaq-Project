import type { JSX } from "react";
import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage(): Promise<JSX.Element> {
  await requireUser();
  const profile = await getProfile();

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-h1 text-text-primary">Profile</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          How you appear to everyone else in your workspaces.
        </p>
      </header>
      <ProfileForm
        fullName={profile?.fullName ?? ""}
        avatarUrl={profile?.avatarUrl ?? ""}
        email={profile?.email ?? ""}
      />
    </div>
  );
}
