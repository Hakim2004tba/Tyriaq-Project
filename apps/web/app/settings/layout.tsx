import type { ReactNode } from "react";
import { AppFrame } from "@/components/shell";
import { requireUser } from "@/lib/auth/session";

/** Profile settings need a signed-in user but not a workspace — someone
 * mid-onboarding can still edit their name. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <AppFrame>{children}</AppFrame>;
}
