"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button, Input, toast } from "@flow/ui";
import { cn } from "@flow/utils";
import { savePlatformSettings } from "@/lib/actions/admin";
import type { PlatformSettings } from "@/lib/data/admin";

/**
 * Platform settings.
 *
 * Three settings, all of which do something. The previous version had
 * five switches and three number fields, none of which was stored
 * anywhere or read by any code — a settings screen that saves nothing
 * teaches people that the controls in this product are decorative.
 *
 * Free-plan limits are NOT here. They live on the plan itself, and
 * editing the same number in two places is how the two end up
 * disagreeing; this links to where they are.
 */
export function SettingsForm({
  settings,
  disabled,
}: {
  settings: PlatformSettings;
  disabled?: boolean;
}) {
  const [signupsOpen, setSignupsOpen] = useState(settings.signupsOpen);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await savePlatformSettings({ signupsOpen, supportEmail, announcement });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDirty(false);
      toast.success(result.message ?? "Saved.");
    });
  }

  function discard() {
    setSignupsOpen(settings.signupsOpen);
    setSupportEmail(settings.supportEmail);
    setAnnouncement(settings.announcement);
    setDirty(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-body font-medium text-text-primary">Platform</h2>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          <li className="flex items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm text-text-primary">Open signups</span>
              <span className="block text-caption text-text-muted">
                Anybody can create an account and a workspace.
              </span>
              {!signupsOpen && (
                <span className="mt-0.5 block text-caption text-warning">
                  With this off, only people holding an invitation can join.
                </span>
              )}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={signupsOpen}
              aria-label="Open signups"
              disabled={disabled || pending}
              onClick={() => {
                setSignupsOpen((current) => !current);
                setDirty(true);
              }}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
                "focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-40",
                signupsOpen ? "bg-primary" : "bg-surface-elevated ring-1 ring-inset ring-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white transition-[left] duration-fast",
                  signupsOpen ? "left-[18px]" : "left-0.5"
                )}
                aria-hidden="true"
              >
                {signupsOpen && <Check className="size-2.5 text-primary" />}
              </span>
            </button>
          </li>
        </ul>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-text-secondary">Support address</span>
            <Input
              type="email"
              value={supportEmail}
              disabled={disabled || pending}
              placeholder="support@your-domain"
              onChange={(event) => {
                setSupportEmail(event.target.value);
                setDirty(true);
              }}
            />
            <span className="text-caption text-text-muted">
              Shown to customers who need help.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-text-secondary">Announcement</span>
            <Input
              value={announcement}
              disabled={disabled || pending}
              placeholder="Planned maintenance on Friday…"
              onChange={(event) => {
                setAnnouncement(event.target.value);
                setDirty(true);
              }}
            />
            <span className="text-caption text-text-muted">
              Leave empty for none. Stored, and shown wherever the product decides to show it.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-body font-medium text-text-primary">Limits</h2>
        <p className="mt-0.5 text-caption text-text-muted">
          What each plan allows lives on the plan, so that the number enforced and the number shown
          are the same one.{" "}
          <Link href="/admin/plans" className="text-primary hover:underline">
            Edit the plans
          </Link>
          .
        </p>
      </section>

      <div className="flex items-center justify-end gap-2">
        {dirty && <p className="mr-auto text-caption text-text-muted">Unsaved changes</p>}
        <Button variant="secondary" disabled={!dirty || pending} onClick={discard}>
          Discard
        </Button>
        <Button disabled={!dirty || disabled} loading={pending} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
