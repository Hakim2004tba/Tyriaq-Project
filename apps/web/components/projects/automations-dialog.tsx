"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Plus, Trash2, Zap } from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { formatRelative, TASK_STATUS_META, type Person } from "@/lib/data/task-types";
import { PRIORITY_ORDER } from "@/lib/data/task-types";
import type { Automation } from "@/lib/data/automations";
import type { AutomationAction, AutomationTrigger } from "@/lib/automations/run";
import type { ProjectStatus } from "@/lib/data/board";
import {
  deleteAutomation,
  saveAutomation,
  setAutomationEnabled,
} from "@/lib/actions/automation";

/**
 * Rules, written as sentences.
 *
 * "When a task moves to Done → assign Hakim" rather than a form with a
 * Trigger field and an Actions array. The sentence is the mental model
 * people already have, and a builder that mirrors it needs no
 * explanation; one that exposes the data shape needs a manual.
 *
 * Every rule shows when it last ran and whether that worked. An
 * automation is invisible by nature — somebody's task changed and
 * nobody touched it — so the only thing that makes one trustworthy is
 * being able to see it working.
 */

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  task_created: "a task is created",
  status_changed: "a task changes status",
  assigned: "somebody is assigned",
  priority_changed: "the priority changes",
  due_soon: "a task is due soon",
};

const ACTION_LABEL: Record<AutomationAction["type"], string> = {
  assign: "assign it to",
  set_priority: "set its priority to",
  set_status: "move it to",
  add_tag: "tag it",
  comment: "comment",
};

export function AutomationsDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  automations,
  people,
  statuses,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  automations: Automation[];
  people: Person[];
  statuses: ProjectStatus[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState(automations);
  const [building, setBuilding] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("status_changed");
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [pending, startTransition] = useTransition();

  function reset() {
    setBuilding(false);
    setName("");
    setTrigger("status_changed");
    setActions([]);
  }

  function create() {
    startTransition(async () => {
      const result = await saveAutomation({
        projectId,
        name: name.trim() || describe(trigger, actions),
        trigger,
        conditions: {},
        actions,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Created.");
      reset();
    });
  }

  function toggle(rule: Automation) {
    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.id === rule.id ? { ...row, enabled: !row.enabled } : row))
    );
    startTransition(async () => {
      const result = await setAutomationEnabled(rule.id, !rule.enabled);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
      }
    });
  }

  function remove(rule: Automation) {
    const previous = rows;
    setRows((current) => current.filter((row) => row.id !== rule.id));
    startTransition(async () => {
      const result = await deleteAutomation(rule.id);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
      }
    });
  }

  /** The sentence a rule makes, for the name field's placeholder. */
  function describe(t: AutomationTrigger, list: AutomationAction[]): string {
    const what = list.map((action) => ACTION_LABEL[action.type]).join(", then ");
    return `When ${TRIGGER_LABEL[t]}, ${what || "do nothing"}`;
  }

  function actionText(action: AutomationAction): string {
    switch (action.type) {
      case "assign":
        return `assign it to ${people.find((p) => p.id === action.user_id)?.name ?? "somebody"}`;
      case "set_priority":
        return `set its priority to ${action.priority}`;
      case "set_status":
        return `move it to ${statuses.find((s) => s.id === action.status_id)?.name ?? "a column"}`;
      case "add_tag":
        return `tag it “${action.tag}”`;
      case "comment":
        return `comment “${(action.body ?? "").slice(0, 40)}”`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Automations on {projectName}</DialogTitle>
          <DialogDescription>
            Rules that run after somebody changes a task, so the same small jobs do not have to be
            done by hand every time.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && !building ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-6 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-muted text-primary">
              <Zap className="size-4" aria-hidden="true" />
            </span>
            <p className="text-body-sm text-text-secondary">
              Nothing runs automatically on this project yet.
            </p>
            {canManage && (
              <Button size="sm" onClick={() => setBuilding(true)}>
                Write the first rule
              </Button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border px-3 py-2.5",
                  rule.enabled ? "border-border bg-surface-muted/40" : "border-border opacity-60"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm text-text-primary">
                      When {TRIGGER_LABEL[rule.trigger]},{" "}
                      {rule.actions.map((action, i) => (
                        <span key={i}>
                          {i > 0 && ", then "}
                          <span className="text-primary">{actionText(action)}</span>
                        </span>
                      ))}
                    </span>

                    {/*
                      Last run and its outcome. An automation nobody can
                      see working is one nobody trusts — this is the
                      whole reason the run log exists.
                    */}
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {rule.lastRun ? (
                        <>
                          {rule.lastRun.status === "failed" && (
                            <AlertTriangle
                              className="me-1 inline size-3 text-danger"
                              aria-hidden="true"
                            />
                          )}
                          Last ran {formatRelative(rule.lastRun.at)}
                          {rule.lastRun.status !== "ok" && ` — ${rule.lastRun.detail ?? rule.lastRun.status}`}
                          {rule.runCount > 1 && ` · ${rule.runCount} runs`}
                        </>
                      ) : (
                        "Has not run yet"
                      )}
                    </span>
                  </span>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        aria-label={rule.enabled ? `Pause ${rule.name}` : `Turn on ${rule.name}`}
                        disabled={pending}
                        onClick={() => toggle(rule)}
                        className={cn(
                          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
                          "focus-visible:outline-none focus-visible:shadow-focus",
                          rule.enabled ? "bg-primary" : "bg-surface-elevated ring-1 ring-inset ring-border"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 flex size-4 items-center justify-center rounded-full bg-white transition-[inset-inline-start] duration-fast",
                            rule.enabled ? "start-[18px]" : "start-0.5"
                          )}
                          aria-hidden="true"
                        >
                          {rule.enabled && <Check className="size-2.5 text-primary" />}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(rule)}
                        aria-label={`Remove ${rule.name}`}
                        className="flex size-6 shrink-0 items-center justify-center rounded text-text-muted
                                   transition-colors hover:bg-danger-subtle hover:text-danger
                                   focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage && building && (
          <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-primary-muted/20 p-3">
            <p className="text-body-sm text-text-primary">
              When{" "}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded px-1 text-primary underline decoration-dotted
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {TRIGGER_LABEL[trigger]}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {(Object.keys(TRIGGER_LABEL) as AutomationTrigger[]).map((option) => (
                    <DropdownMenuItem key={option} onSelect={() => setTrigger(option)}>
                      {TRIGGER_LABEL[option]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              …
            </p>

            {actions.length > 0 && (
              <ul className="flex flex-col gap-1">
                {actions.map((action, index) => (
                  <li key={index} className="flex items-center gap-2 text-body-sm text-text-secondary">
                    <span className="flex-1">→ {actionText(action)}</span>
                    <button
                      type="button"
                      onClick={() => setActions((current) => current.filter((_, i) => i !== index))}
                      aria-label="Remove this action"
                      className="rounded px-1 text-caption text-text-muted hover:text-danger
                                 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Plus className="size-3.5" />
                    Add something to do
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {people.slice(0, 8).map((person) => (
                    <DropdownMenuItem
                      key={person.id}
                      onSelect={() =>
                        setActions((current) => [...current, { type: "assign", user_id: person.id }])
                      }
                    >
                      <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="xs" />
                      Assign to {person.name}
                    </DropdownMenuItem>
                  ))}
                  {PRIORITY_ORDER.map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      onSelect={() =>
                        setActions((current) => [...current, { type: "set_priority", priority }])
                      }
                    >
                      Set priority to {priority}
                    </DropdownMenuItem>
                  ))}
                  {statuses.map((status) => (
                    <DropdownMenuItem
                      key={status.id}
                      onSelect={() =>
                        setActions((current) => [
                          ...current,
                          { type: "set_status", status_id: status.id },
                        ])
                      }
                    >
                      Move to {status.name}
                    </DropdownMenuItem>
                  ))}
                  {statuses.length === 0 &&
                    (Object.keys(TASK_STATUS_META) as (keyof typeof TASK_STATUS_META)[]).map(
                      (status) => (
                        <DropdownMenuItem key={status} disabled>
                          Move to {TASK_STATUS_META[status].label} — needs board columns
                        </DropdownMenuItem>
                      )
                    )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={describe(trigger, actions)}
                aria-label="Name this rule"
                className="min-w-[10rem] flex-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button size="sm" loading={pending} disabled={actions.length === 0} onClick={create}>
                Create rule
              </Button>
            </div>
          </div>
        )}

        {canManage && !building && rows.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setBuilding(true)} className="self-start">
            <Plus className="size-3.5" />
            Add a rule
          </Button>
        )}

        {/*
          Said once, where somebody is writing a rule that could loop.
          "When Done → move to Archived" is the first thing anybody
          tries, and finding out by watching it not work is worse than
          being told.
        */}
        {canManage && (
          <p className="text-caption text-text-muted">
            A rule runs after a person changes something. One rule cannot start another — a chain
            stops after the first step, which is what keeps “when Done, set Done” from running
            forever.
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
