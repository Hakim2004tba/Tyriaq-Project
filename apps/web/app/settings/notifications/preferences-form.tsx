"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button, SectionCard, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { setMutedKinds } from "@/lib/actions/notification";
import { KIND_META, NOTIFICATION_KINDS, type NotificationKind } from "@/lib/data/notification-types";

/**
 * Which kinds to receive.
 *
 * Stored as what is muted rather than what is wanted, so a person who
 * has never opened this screen gets everything — and a kind added in a
 * later release arrives by default instead of being silently off for
 * everybody who saved preferences before it existed.
 */
export function NotificationPreferences({ mutedKinds }: { mutedKinds: NotificationKind[] }) {
  const [muted, setMuted] = useState<Set<NotificationKind>>(() => new Set(mutedKinds));
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function toggle(kind: NotificationKind) {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const result = await setMutedKinds(Array.from(muted));
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.message ?? "Saved.");
        setDirty(false);
      }
    });
  }

  return (
    <SectionCard
      title="What you hear about"
      subtitle={`${NOTIFICATION_KINDS.length - muted.size} of ${NOTIFICATION_KINDS.length} on`}
      action={
        dirty ? (
          <Button size="sm" onClick={save} loading={pending}>
            Save changes
          </Button>
        ) : undefined
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {NOTIFICATION_KINDS.map((kind) => {
          const on = !muted.has(kind);
          const meta = KIND_META[kind];
          return (
            <li key={kind} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-text-primary">{meta.label}</span>
                <span className="block text-caption text-text-muted">{meta.description}</span>
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={meta.label}
                onClick={() => toggle(kind)}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  on ? "bg-primary" : "bg-surface-elevated ring-1 ring-inset ring-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white transition-[left] duration-fast",
                    on ? "left-[18px]" : "left-0.5"
                  )}
                  aria-hidden="true"
                >
                  {on && <Check className="size-2.5 text-primary" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-caption text-text-muted">
        Preferences are per workspace. Muting a kind stops it being created at all — turning it back
        on will not recover what was not sent.
      </p>
    </SectionCard>
  );
}
