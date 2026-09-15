"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button, SectionCard, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { setEmailPreferences, setMutedKinds } from "@/lib/actions/notification";
import { KIND_META, NOTIFICATION_KINDS, type NotificationKind } from "@/lib/data/notification-types";

/**
 * Which kinds to receive.
 *
 * Stored as what is muted rather than what is wanted, so a person who
 * has never opened this screen gets everything — and a kind added in a
 * later release arrives by default instead of being silently off for
 * everybody who saved preferences before it existed.
 */
export function NotificationPreferences({
  mutedKinds,
  emailDigest,
  emailMentions,
  mailConfigured,
}: {
  mutedKinds: NotificationKind[];
  emailDigest: boolean;
  emailMentions: boolean;
  /** Whether a provider is set up at all. */
  mailConfigured: boolean;
}) {
  const [muted, setMuted] = useState<Set<NotificationKind>>(() => new Set(mutedKinds));
  const [digest, setDigest] = useState(emailDigest);
  const [mentions, setMentions] = useState(emailMentions);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function setEmail(patch: { digest?: boolean; mentions?: boolean }) {
    if (patch.digest !== undefined) setDigest(patch.digest);
    if (patch.mentions !== undefined) setMentions(patch.mentions);
    startTransition(async () => {
      const result = await setEmailPreferences(patch);
      if (result.error) {
        // Put the switch back rather than leaving it showing a setting
        // that was not saved.
        if (patch.digest !== undefined) setDigest(!patch.digest);
        if (patch.mentions !== undefined) setMentions(!patch.mentions);
        toast.error(result.error);
      }
    });
  }

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
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Email"
        subtitle={
          mailConfigured
            ? "Tyriaq can reach you when you are not looking at it"
            : "No mail provider is configured yet — nothing is being sent"
        }
      >
        <ul className="flex flex-col divide-y divide-border">
          <EmailSwitch
            label="The moment somebody names me"
            description="A mention in a comment or a message, sent straight away."
            checked={mentions}
            disabled={pending || !mailConfigured}
            onChange={(next) => setEmail({ mentions: next })}
          />
          <EmailSwitch
            label="A daily summary"
            description="Everything unread from the day before, in one message."
            checked={digest}
            disabled={pending || !mailConfigured}
            onChange={(next) => setEmail({ digest: next })}
          />
        </ul>
      </SectionCard>

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
          Preferences are per workspace. Muting a kind stops it being created at all — turning it
          back on will not recover what was not sent.
        </p>
      </SectionCard>
    </div>
  );
}

/**
 * One email switch.
 *
 * Saves on toggle rather than behind the Save button above: the kinds
 * list is a set of choices somebody reviews together, while these two
 * are single decisions, and mixing "saves immediately" with "saves on
 * Save" inside one screen is how a setting gets lost.
 */
function EmailSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm text-text-primary">{label}</span>
        <span className="block text-caption text-text-muted">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-40",
          checked ? "bg-primary" : "bg-surface-elevated ring-1 ring-inset ring-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white transition-[left] duration-fast",
            checked ? "left-[18px]" : "left-0.5"
          )}
          aria-hidden="true"
        >
          {checked && <Check className="size-2.5 text-primary" />}
        </span>
      </button>
    </li>
  );
}
