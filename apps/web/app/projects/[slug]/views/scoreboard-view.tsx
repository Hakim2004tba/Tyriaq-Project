"use client";

import { useState, useTransition } from "react";
import {
  Award,
  Clock,
  Crown,
  Heart,
  Settings2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Progress,
  SectionCard,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { formatRelative, type Person } from "@/lib/data/task-types";
import {
  EVENT_LABEL,
  WEIGHT_LABEL,
  type LeaderboardRow,
  type ProjectScoring,
} from "@/lib/data/scoring-types";
import { enableScoring, giveKudos } from "@/lib/actions/scoring";
import { ScoringRulesDialog } from "@/components/projects/scoring-rules-dialog";

/**
 * Who has been carrying this project.
 *
 * Three things on purpose:
 *
 * The total is never shown alone. Beside it sit "finished" and "on
 * time", because points reward volume and a ratio does not — the person
 * who closed eleven things late and the one who closed four on time
 * should not be separated by a single number that only one of them
 * understands.
 *
 * It is a MONTH by default, not all time. An all-time board is a tenure
 * chart: whoever joined first wins permanently, and nobody who arrives
 * later has a reason to look at it twice.
 *
 * And everything is explainable. The rules are on the same screen, the
 * recent awards say what paid and why, and anybody can read both —
 * because a score people cannot interrogate is one they stop believing,
 * and a leaderboard nobody believes is worse than none.
 */

const PERIODS = [
  { id: "week", label: "This week", days: 7 },
  { id: "month", label: "This month", days: 30 },
  { id: "all", label: "All time", days: null },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

export function ScoreboardView({
  projectId,
  projectName,
  scoring,
  viewerId,
  canManage,
  period,
  onPeriodChange,
}: {
  projectId: string;
  projectName: string;
  scoring: ProjectScoring;
  viewerId: string;
  canManage: boolean;
  period: PeriodId;
  onPeriodChange: (next: PeriodId) => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [thanking, setThanking] = useState<Person | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function turnOn() {
    startTransition(async () => {
      const result = await enableScoring(projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Scoring is on.");
    });
  }

  function thank() {
    if (!thanking) return;
    const person = thanking;
    startTransition(async () => {
      const result = await giveKudos({ projectId, toUserId: person.id, message });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setThanking(null);
      setMessage("");
      toast.success(`Thanked ${person.name}.`);
    });
  }

  if (!scoring.enabled) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={<Award className="size-5" />}
          title="This project does not keep score"
          description="Turn it on and finishing work starts earning points — weighted by the size of the task, capped so a burst of small jobs cannot dominate, and taken back if something is reopened."
          action={
            canManage ? (
              <Button loading={pending} onClick={turnOn}>
                Turn on scoring
              </Button>
            ) : (
              <p className="text-caption text-text-muted">
                Only a space or workspace admin can turn this on.
              </p>
            )
          }
        />
      </div>
    );
  }

  const top = scoring.leaderboard[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(next) => onPeriodChange(next as PeriodId)}>
          <TabsList>
            {PERIODS.map((option) => (
              <TabsTrigger key={option.id} value={option.id}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <span className="flex items-center gap-2">
          {/*
            The remaining budget is shown whether or not anybody is
            about to spend it. "3 kudos left this week" is the thing
            that makes somebody look for a reason to use one.
          */}
          <Badge variant={scoring.kudosLeft > 0 ? "primary" : "neutral"} size="sm">
            <Heart className="size-3" aria-hidden="true" />
            {scoring.kudosLeft} kudos left this week
          </Badge>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setRulesOpen(true)}>
              <Settings2 className="size-3.5" />
              How points work
            </Button>
          )}
        </span>
      </div>

      {scoring.leaderboard.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="size-5" />}
          title="Nothing earned yet"
          description="Points appear as work is finished. Assign a task to somebody and complete it, and this fills in."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SectionCard
            title="Standings"
            subtitle={
              top
                ? `${top.person.name} is ahead with ${top.points.toLocaleString()} points`
                : undefined
            }
            flush
          >
            <ul className="flex flex-col divide-y divide-border border-t border-border">
              {scoring.leaderboard.map((row, index) => (
                <Standing
                  key={row.person.id}
                  row={row}
                  rank={index + 1}
                  best={scoring.leaderboard[0]?.points ?? 0}
                  isViewer={row.person.id === viewerId}
                  canThank={scoring.kudosLeft > 0 && row.person.id !== viewerId}
                  onThank={() => setThanking(row.person)}
                />
              ))}
            </ul>
          </SectionCard>

          <div className="flex flex-col gap-4">
            <SectionCard title="What earns points" subtitle="The same for everybody">
              <ul className="flex flex-col gap-2">
                {scoring.rules
                  .filter((rule) => rule.enabled)
                  .map((rule) => (
                    <li key={rule.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm text-text-primary">
                          {EVENT_LABEL[rule.event]}
                        </span>
                        <span className="block text-caption text-text-muted">
                          {WEIGHT_LABEL[rule.weight]}
                          {rule.dailyCap !== null && ` · up to ${rule.dailyCap} a day`}
                        </span>
                      </span>
                      <span className="shrink-0 text-body-sm font-medium tabular text-primary">
                        +{rule.points}
                      </span>
                    </li>
                  ))}
              </ul>
            </SectionCard>

            <SectionCard title="Recently earned" subtitle="Every point, and what for">
              {scoring.recent.length === 0 ? (
                <p className="text-body-sm text-text-muted">Nothing yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {scoring.recent.map((entry) => (
                    <li key={entry.id} className="flex items-baseline gap-2 text-caption">
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular",
                          entry.points > 0 ? "text-success" : "text-danger"
                        )}
                      >
                        {entry.points > 0 ? "+" : ""}
                        {entry.points}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-text-secondary">
                        {EVENT_LABEL[entry.event]}
                        {entry.taskTitle && ` — ${entry.taskTitle}`}
                        {entry.reason && ` — “${entry.reason}”`}
                      </span>
                      <span className="shrink-0 text-text-muted">{formatRelative(entry.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      <Dialog open={thanking !== null} onOpenChange={(open) => !open && setThanking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thank {thanking?.name}</DialogTitle>
            <DialogDescription>
              You have {scoring.kudosLeft} to give this week. The small number is the point — one
              that costs nothing means nothing.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && thank()}
            placeholder="Saved me an hour on the deploy"
            aria-label="Why"
            autoFocus
          />

          <DialogFooter>
            <Button variant="secondary" onClick={() => setThanking(null)}>
              Cancel
            </Button>
            <Button loading={pending} onClick={thank}>
              <Heart className="size-3.5" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScoringRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        projectId={projectId}
        projectName={projectName}
        rules={scoring.rules}
      />
    </div>
  );
}

/**
 * One person's line.
 *
 * The bar is relative to the leader rather than to a target, because
 * there is no target — what the eye wants here is the gap, and a bar
 * against an invented maximum would invent the gap too.
 */
function Standing({
  row,
  rank,
  best,
  isViewer,
  canThank,
  onThank,
}: {
  row: LeaderboardRow;
  rank: number;
  best: number;
  isViewer: boolean;
  canThank: boolean;
  onThank: () => void;
}) {
  const share = best > 0 ? Math.round((row.points / best) * 100) : 0;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 px-4 py-3",
        isViewer && "bg-primary-muted/20"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular",
          rank === 1
            ? "bg-warning-subtle text-warning"
            : rank === 2
              ? "bg-surface-elevated text-text-secondary"
              : rank === 3
                ? "bg-primary-muted text-primary"
                : "text-text-muted"
        )}
      >
        {rank === 1 ? <Crown className="size-3.5" aria-hidden="true" /> : rank}
      </span>

      <Avatar name={row.person.name} src={row.person.avatarUrl ?? undefined} size="sm" />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-body-sm text-text-primary">{row.person.name}</span>
          {isViewer && <span className="shrink-0 text-caption text-text-muted">you</span>}
        </span>

        {/*
          The figures that stop the total being the whole story. Points
          alone reward volume; "6 finished · 83% on time" is the sentence
          somebody would actually say about a colleague.
        */}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-text-muted">
          <span>
            {row.completed} finished
          </span>
          {row.onTimeRate !== null && (
            <span className={cn(row.onTimeRate >= 80 && "text-success")}>
              <Clock className="me-1 inline size-3" aria-hidden="true" />
              {row.onTimeRate}% on time
            </span>
          )}
          {row.kudos > 0 && (
            <span>
              <Heart className="me-1 inline size-3 text-primary" aria-hidden="true" />
              {row.kudos}
            </span>
          )}
        </span>

        <Progress
          value={share}
          label={`${row.person.name}'s share of the leader's points`}
          className="mt-1.5"
        />
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {canThank && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onThank}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Sparkles className="size-3.5" />
            Thank
          </Button>
        )}
        <span className="w-16 text-end text-h4 tabular text-text-primary">
          {row.points.toLocaleString()}
        </span>
      </span>
    </li>
  );
}

export { PERIODS, type PeriodId };
