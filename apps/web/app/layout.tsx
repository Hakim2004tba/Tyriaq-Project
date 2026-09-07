import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import { Toaster } from "@flow/ui";
import { SpaceStoreProvider } from "@/components/spaces/space-store";
import { SessionProvider } from "@/components/auth/session-provider";
import { getProfile } from "@/lib/auth/session";
import { getProjects, getSpaces, getWorkspaces } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  const [profile, workspaces, spaces, projects] = isSupabaseConfigured
    ? await Promise.all([getProfile(), getWorkspaces(), getSpaces(), getProjects()])
    : [null, [], [], []];

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider value={{ profile, workspaces }}>
          <SpaceStoreProvider data={{ workspaces, spaces, projects }}>
            {children}
          </SpaceStoreProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
