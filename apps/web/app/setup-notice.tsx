import { Database } from "lucide-react";
import { Card, Wordmark } from "@flow/ui";

/**
 * Shown when Supabase credentials are missing.
 *
 * A clone with no `.env.local` would otherwise fail somewhere inside the
 * auth client with a message that says nothing about what to do. This is
 * a setup gate, not a fallback mode — no part of the app works without a
 * real project behind it.
 */
export function SetupNotice() {
  return (
    <div className="tq-aurora flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Wordmark size={30} />
      <Card className="flex w-full max-w-[560px] flex-col gap-4 p-6">
        <span className="flex size-10 items-center justify-center rounded-lg bg-warning-subtle text-warning">
          <Database className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-h3 text-text-primary">Connect a Supabase project</h1>
          <p className="mt-1.5 text-body-sm text-text-secondary">
            Tyriaq needs a database before it can sign anyone in. Create{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-caption">
              apps/web/.env.local
            </code>{" "}
            with your project credentials, then restart the dev server.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-md border border-border bg-surface-muted p-3 font-mono text-caption text-text-secondary">
{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-caption text-text-muted">
          Both values are on your project&rsquo;s API settings page. The anon key is safe in the
          browser — Row Level Security, not key secrecy, is what protects the data.
        </p>
      </Card>
    </div>
  );
}
