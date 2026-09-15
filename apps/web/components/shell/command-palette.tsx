"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckSquare,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Layers,
  Search as SearchIcon,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@flow/ui";
import { cn } from "@flow/utils";
import { search, type SearchHit, type SearchKind } from "@/lib/actions/search";

const ICON: Record<SearchKind, typeof CheckSquare> = {
  task: CheckSquare,
  project: FolderKanban,
  document: FileText,
  space: Layers,
  person: User,
};

const GROUP: Record<SearchKind, string> = {
  task: "Tasks",
  project: "Projects",
  document: "Documents",
  space: "Spaces",
  person: "People",
};

const ORDER: SearchKind[] = ["task", "project", "document", "space", "person"];

/**
 * Search, over everything.
 *
 * Opens on ⌘K from anywhere, and the arrow keys move a selection that
 * Enter follows — the shape people already know from every other tool,
 * so nothing here has to be learned.
 *
 * Typing is debounced rather than sent per keystroke: five queries per
 * letter would put a dozen requests in flight for one word, and the
 * answers would land out of order. A generation counter throws away any
 * answer that is no longer the one being asked about, which is the
 * failure that makes a search box flicker between results.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const generation = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /*
    The shortcut lives here, not on the button.

    The button is hidden below `md`, and a listener inside it would mean
    ⌘K silently doing nothing on a phone keyboard or on a page scrolled
    past the header. The palette is always mounted, so this always works.
  */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setTerm("");
    setHits([]);
    setActive(0);
  }, [open]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }

    const mine = ++generation.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await search(q);
        // A slower earlier request must not overwrite a newer answer.
        if (generation.current !== mine) return;
        setHits(results);
        setActive(0);
      });
    }, 180);

    return () => clearTimeout(timer);
  }, [term]);

  const grouped = useMemo(() => {
    const map = new Map<SearchKind, SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.kind);
      if (list) list.push(hit);
      else map.set(hit.kind, [hit]);
    }
    return ORDER.filter((kind) => map.has(kind)).map((kind) => ({
      kind,
      items: map.get(kind)!,
    }));
  }, [hits]);

  // The flat order the arrow keys walk, which is the order on screen.
  const flat = useMemo(() => grouped.flatMap((group) => group.items), [grouped]);

  const go = useCallback(
    (hit: SearchHit) => {
      onOpenChange(false);
      router.push(hit.href);
    },
    [onOpenChange, router]
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (flat.length === 0 ? 0 : (current + 1) % flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (flat.length === 0 ? 0 : (current - 1 + flat.length) % flat.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = flat[active];
      if (hit) go(hit);
    }
  }

  const q = term.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Search Tyriaq</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, projects, documents and people…"
            aria-label="Search"
            className="h-12 min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none
                       placeholder:text-text-muted"
          />
          {pending && <span className="shrink-0 text-caption text-text-muted">…</span>}
        </div>

        <div className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5">
          {q.length < 2 ? (
            <p className="px-2.5 py-6 text-center text-body-sm text-text-muted">
              Type at least two letters.
            </p>
          ) : flat.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-body-sm text-text-muted">
              {pending ? "Looking…" : `Nothing matches “${q}”.`}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.kind} className="mb-1 last:mb-0">
                <p className="px-2.5 py-1 text-overline uppercase text-text-muted">
                  {GROUP[group.kind]}
                </p>
                <ul>
                  {group.items.map((hit) => {
                    const Icon = ICON[hit.kind];
                    const index = flat.indexOf(hit);
                    const isActive = index === active;
                    return (
                      <li key={`${hit.kind}-${hit.id}`}>
                        <button
                          type="button"
                          onClick={() => go(hit)}
                          onMouseEnter={() => setActive(index)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                            isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-sm text-text-primary">
                              {hit.title}
                            </span>
                            {hit.context && (
                              <span className="block truncate text-caption text-text-muted">
                                {hit.context}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <CornerDownLeft
                              className="size-3.5 shrink-0 text-text-muted"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-caption text-text-muted">
          <span className="flex items-center gap-1">
            <ArrowRight className="size-3 rotate-90" aria-hidden="true" />
            <ArrowRight className="size-3 -rotate-90" aria-hidden="true" />
            to move
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" aria-hidden="true" />
            to open
          </span>
          <span className="ml-auto">esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
