import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import { Toaster } from "@flow/ui";
import { SpaceStoreProvider } from "@/components/spaces/space-store";
import { SessionProvider } from "@/components/auth/session-provider";
import { getProfile } from "@/lib/auth/session";
import { getProjects, getSpaces, getWorkspaces } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dirOf } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/provider";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tyriaq",
    template: "%s · Tyriaq",
  },
  description: "One platform for tasks, projects, docs and goals.",
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  // Resolved once here so the shell paints with the real user immediately.
  // Read once here so the shell — which renders on every screen — paints
  // with the real user, workspaces and spaces on the first frame.
  const [locale, [profile, workspaces, spaces, projects]] = await Promise.all([
    getLocale(),
    isSupabaseConfigured
      ? Promise.all([getProfile(), getWorkspaces(), getSpaces(), getProjects()])
      : Promise.resolve([null, [], [], []] as [null, [], [], []]),
  ]);

  /*
    `dir` is set here, on <html>, and nowhere else.

    Setting it on a wrapper div would leave the scrollbar, the text
    selection direction and every `position: fixed` overlay on the
    wrong side — those belong to the document, not to a subtree.
  */
  return (
    <html lang={locale} dir={dirOf(locale)} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>
          <SessionProvider value={{ profile, workspaces }}>
            <SpaceStoreProvider data={{ workspaces, spaces, projects }}>
              {children}
            </SpaceStoreProvider>
          </SessionProvider>
        </LocaleProvider>
        <Toaster />
      </body>
    </html>
  );
}
