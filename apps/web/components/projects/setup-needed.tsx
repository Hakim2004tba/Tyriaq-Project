"use client";

import { Database } from "lucide-react";

/**
 * A feature whose database half has not been installed yet.
 *
 * Shown instead of the controls, because the alternative is what
 * happened three times already: a button that offers to turn something
 * on, and answers "Could not find the function public.enable_scoring in
 * the schema cache" — a sentence that tells the person nothing they can
 * act on and reads like they broke something.
 *
 * It names the file. Knowing WHICH of twenty SQL files to run is the
 * entire difficulty, and the app is the only thing that knows.
 */
export function SetupNeeded({ feature, file }: { feature: string; file: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-warning-subtle text-warning">
        <Database className="size-4" aria-hidden="true" />
      </span>
      <p className="text-body-sm text-text-primary">{feature} is not installed yet</p>
      <p className="max-w-sm text-caption leading-relaxed text-text-secondary">
        Run this file in the Supabase SQL editor — select all of it, press Run — and reload this
        page. Nothing else in Tyriaq is affected until you do.
      </p>
      <code className="rounded bg-surface-muted px-2 py-1 font-mono text-caption text-text-primary">
        {file}
      </code>
    </div>
  );
}
