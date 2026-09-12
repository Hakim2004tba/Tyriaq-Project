"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Input, toast } from "@flow/ui";
import { cn } from "@flow/utils";

interface Toggle {
  id: string;
  label: string;
  description: string;
  on: boolean;
  /** Turning this ON is the risky direction, so it confirms in copy. */
  caution?: string;
}

const INITIAL: Toggle[] = [
  { id: "signups", label: "Open signups", description: "Anybody can create an account and a workspace.", on: true },
  { id: "invites", label: "Invitations", description: "Members can invite people into their workspace.", on: true },
  { id: "trials", label: "Free trials", description: "New workspaces start on a 14-day Business trial.", on: true },
  {
    id: "maintenance",
    label: "Maintenance mode",
    description: "Everybody but administrators sees a maintenance page.",
    on: false,
    caution: "This signs every customer out of the product.",
  },
  { id: "digest", label: "Weekly digest email", description: "Sends each workspace a Monday summary.", on: false },
];

export function SettingsForm() {
  const [toggles, setToggles] = useState(INITIAL);
  const [dirty, setDirty] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-body font-medium text-text-primary">Platform</h2>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {toggles.map((toggle) => (
            <li key={toggle.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-text-primary">{toggle.label}</span>
                <span className="block text-caption text-text-muted">{toggle.description}</span>
                {toggle.caution && !toggle.on && (
                  <span className="mt-0.5 block text-caption text-warning">{toggle.caution}</span>
                )}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={toggle.on}
                aria-label={toggle.label}
                onClick={() => {
                  setToggles((prev) =>
                    prev.map((t) => (t.id === toggle.id ? { ...t, on: !t.on } : t))
                  );
                  setDirty(true);
                }}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  toggle.on
                    ? toggle.caution
                      ? "bg-warning"
                      : "bg-primary"
                    : "bg-surface-elevated ring-1 ring-inset ring-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white transition-[left] duration-fast",
                    toggle.on ? "left-[18px]" : "left-0.5"
                  )}
                  aria-hidden="true"
                >
                  {toggle.on && <Check className="size-2.5 text-primary" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-body font-medium text-text-primary">Limits</h2>
        <p className="mt-0.5 text-caption text-text-muted">
          Applied to free workspaces; paid plans use the limits on the plan itself.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Members per free workspace", value: "3" },
            { label: "Projects per free workspace", value: "2" },
            { label: "Storage per free workspace (GB)", value: "1" },
          ].map((field) => (
            <label key={field.label} className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-secondary">{field.label}</span>
              <Input type="number" defaultValue={field.value} onChange={() => setDirty(true)} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        {dirty && <p className="mr-auto text-caption text-text-muted">Unsaved changes</p>}
        <Button
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            setToggles(INITIAL);
            setDirty(false);
          }}
        >
          Discard
        </Button>
        <Button
          disabled={!dirty}
          onClick={() => {
            setDirty(false);
            toast.success("Settings saved — in this prototype only.");
          }}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
