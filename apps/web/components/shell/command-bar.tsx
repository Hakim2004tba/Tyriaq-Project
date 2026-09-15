"use client";

import { Search } from "lucide-react";
import { Kbd } from "@flow/ui";

/**
 * The topbar command entry.
 *
 * Rendered as a button, not an input: search in Tyriaq opens a command
 * palette rather than filtering in place, and a real <input> here would
 * promise inline typing it doesn't deliver.
 *
 * The ⌘K shortcut is handled by the palette rather than here — this
 * button is hidden on small screens, and the shortcut has to work there
 * too. The hint stays because this is where people look for it.
 */
export function CommandBar({ onOpen }: { onOpen?: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-9 w-full items-center gap-2.5 rounded-md border border-border bg-surface-muted px-3 text-left
                 transition-colors duration-fast hover:border-border-strong hover:bg-surface
                 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:shadow-focus"
    >
      <Search className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-text-secondary" aria-hidden="true" />
      <span className="flex-1 truncate text-body-sm text-text-muted">Search tasks, docs and people…</span>
      <Kbd className="hidden sm:inline-block">⌘K</Kbd>
    </button>
  );
}
