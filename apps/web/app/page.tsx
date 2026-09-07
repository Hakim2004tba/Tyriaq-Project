import type { JSX } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LandingPage } from "@/components/marketing/landing-page";
import { SetupNotice } from "./setup-notice";

/**
 * The front door.
 *
 * `/` is the public page for everybody, signed in or not. It used to
 * redirect a signed-in visitor straight to the dashboard, which meant
 * the site's own home page was unreachable for the people most likely to
 * link to it. Being signed in only changes what the page ASKS you to do:
 * "Open Tyriaq" instead of "Start for free".
 */
export default async function Home(): Promise<JSX.Element> {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const user = await getCurrentUser();
  return <LandingPage signedIn={Boolean(user)} />;
}
