"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
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
import {
  EVENT_LABEL,
  WEIGHT_LABEL,
  type ScoreEvent,
  type ScoreWeight,
  type ScoringRule,
} from "@/lib/data/scoring-types";
import { deleteScoringRule, saveScoringRule } from "@/lib/actions/scoring";

const EVENTS: ScoreEvent[] = [
  "task_completed",
  "completed_on_time",
  "completed_early",
  "review_passed",
  "kudos_received",
];

const WEIGHTS: ScoreWeight[] = ["flat", "estimate", "priority"];

/**
 * What a project pays for, and how much.
 *
 * Owner-editable, and written as sentences for the same reason the
 * automation builder is: "15 points per hour estimated, up to 200 a
 * day" is a rule somebody can argue with. A form of labelled numbers is
 * one they accept without reading, which is how a team ends up measured
 * by something nobody chose.
 *
 * The two defences against farming are visible here rather than hidden
 * in the engine — the weighting and the daily ceiling — because a limit
 * discovered by hitting it feels like a bug.
 */
export function ScoringRulesDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  rules,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  rules: ScoringRule[];
}) {
  const [rows, setRows] = useState(rules);
  const [adding, setAdding] = useState(false);
  const [newEvent, setNewEvent] = useState<ScoreEvent>("comment_posted");
  const [pending, startTransition] = useTransition();

  const used = new Set(rows.map((rule) => rule.event));
  const available = EVENTS.filter((event) => !used.has(event)).concat(
    used.has("comment_posted") ? [] : ["comment_posted"],
    used.has("time_logged") ? [] : ["time_logged"]
  );

  function save(rule: ScoringRule, patch: Partial<ScoringRule>) {
    const previous = rows;
    const next = { ...rule, ...patch };
    setRows((current) => current.map((row) => (row.id === rule.id ? next : row)));

    startTransition(async () => {
      const result = await saveScoringRule({
        id: rule.id,
        projectId,
        event: next.event,
        points: next.points,
        weight: next.weight,
        dailyCap: next.dailyCap,
        enabled: next.enabled,
      });
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
      }
    });
  }

  function add() {
    startTransition(async () => {
      const result = await saveScoringRule({
        projectId,
        event: newEvent,
        points: 5,
        weight: "flat",
        dailyCap: 50,
        enabled: true,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAdding(false);
      toast.success(result.message ?? "Added.");
    });
  }

  function remove(rule: ScoringRule) {
    const previous = rows;
    setRows((current) => current.filter((row) => row.id !== rule.id));
    startTransition(async () => {
      const result = await deleteScoringRule(rule.id);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Removed.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>How {projectName} scores</DialogTitle>
          <DialogDescription>
            Everybody on the project can read these. Only an admin can change them — somebody who
            could rewrite the rules they are measured by is not being measured.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {rows.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5",
                rule.enabled ? "border-border bg-surface-muted/40" : "border-border opacity-60"
              )}
            >
              <span className="min-w-0 flex-1 text-body-sm text-text-primary">
                {EVENT_LABEL[rule.event]}
              </span>

              <span className="flex items-center gap-1 text-caption text-text-muted">
                <Input
                  type="number"
                  defaultValue={rule.points}
                  onBlur={(event) => {
                    const points = Number(event.target.value);
                    if (Number.isFinite(points) && points !== rule.points) save(rule, { points });
                  }}
                  aria-label={`Points for ${EVENT_LABEL[rule.event]}`}
                  className="w-20"
                />
                points
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-caption text-primary underline decoration-dotted
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    {WEIGHT_LABEL[rule.weight]}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {WEIGHTS.map((weight) => (
                    <DropdownMenuItem key={weight} onSelect={() => save(rule, { weight })}>
                      <span className="flex size-4 items-center justify-center">
                        {rule.weight === weight && <Check className="size-3.5" />}
                      </span>
                      {WEIGHT_LABEL[weight]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="flex items-center gap-1 text-caption text-text-muted">
                up to
                <Input
                  type="number"
                  defaultValue={rule.dailyCap ?? ""}
                  placeholder="∞"
                  onBlur={(event) => {
                    const raw = event.target.value.trim();
                    const cap = raw === "" ? null : Number(raw);
                    if (cap !== rule.dailyCap) save(rule, { dailyCap: cap });
                  }}
                  aria-label={`Daily cap for ${EVENT_LABEL[rule.event]}`}
                  className="w-20"
                />
                a day
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={rule.enabled ? "Turn off" : "Turn on"}
                disabled={pending}
                onClick={() => save(rule, { enabled: !rule.enabled })}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast",
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
                aria-label={`Remove ${EVENT_LABEL[rule.event]}`}
                className="flex size-6 shrink-0 items-center justify-center rounded text-text-muted
                           transition-colors hover:bg-danger-subtle hover:text-danger
                           focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {available.length > 0 &&
          (adding ? (
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    {EVENT_LABEL[newEvent]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {available.map((event) => (
                    <DropdownMenuItem key={event} onSelect={() => setNewEvent(event)}>
                      {EVENT_LABEL[event]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" loading={pending} onClick={add}>
                Add it
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="self-start">
              <Plus className="size-3.5" />
              Reward something else
            </Button>
          ))}

        {/*
          The two things somebody will otherwise discover the hard way.
        */}
        <p className="text-caption leading-relaxed text-text-muted">
          Changing a rule applies from now on — nothing already earned moves, because a total that
          changed overnight for last month&rsquo;s work would be unexplainable. Reopening a finished
          task takes its points back.
        </p>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
