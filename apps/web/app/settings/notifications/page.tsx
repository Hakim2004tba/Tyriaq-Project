import type { JSX } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getNotifications } from "@/lib/data/notifications";
import { isMailConfigured } from "@/lib/mail/send";
import { NotificationPreferences } from "./preferences-form";

export const metadata: Metadata = { title: "Notification preferences" };

export default async function NotificationSettingsPage(): Promise<JSX.Element> {
  await requireUser();
  const { mutedKinds, emailDigest, emailMentions } = await getNotifications(1);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-h1 text-text-primary">Notifications</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          What Tyriaq tells you about. Everything is on until you turn it off.
        </p>
      </header>

      <NotificationPreferences
        mutedKinds={mutedKinds}
        emailDigest={emailDigest}
        emailMentions={emailMentions}
        mailConfigured={isMailConfigured}
      />
    </div>
  );
}
