import type { JSX, ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@flow/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "../setup-notice";

/**
 * The auth shell.
 *
 * Deliberately not the application shell — there is no workspace to
 * navigate yet. It reuses the same aurora ground and surface tokens so
 * signing in feels like the same product, without pretending there is a
 * sidebar behind the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  // Signing in cannot work without a project; show how to connect one
  // instead of a form that fails on submit.
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <div className="tq-aurora flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Link
        href="/"
        className="rounded-md focus-visible:outline-none focus-visible:shadow-focus"
        aria-label="Tyriaq"
      >
        <Wordmark size={30} />
      </Link>
      <main className="w-full max-w-[400px]">{children}</main>
      <p className="text-caption text-text-muted">One platform for tasks, projects and goals.</p>
    </div>
  );
}
