import * as React from "react";
import { Play, Square, Clock } from "lucide-react";
import type { TaskTimeSummary } from "@flow/types";
import { formatDuration } from "@flow/utils";
import { Button } from "../button/button";

export interface TimeTrackerProps {
  summary: TaskTimeSummary;
  /** Whether the viewer may start/stop a timer or add a manual entry on
   * this task (task-permission-derived, computed by the caller). */
  canTrack: boolean;
  onStart: () => void;
  onStop: () => void;
  onAddManualEntry?: () => void;
}

/**
 * The Task Detail time-tracking control: total tracked time, and either
 * a Start button or a live-ticking Stop button depending on whether the
 * viewer currently has a running entry on this task. The ticking display
 * is a local interval purely for showing elapsed time — it never
 * fetches or computes the authoritative duration (that's the database's
 * GENERATED column, read back after stop).
 */
export function TimeTracker({ summary, canTrack, onStart, onStop, onAddManualEntry }: TimeTrackerProps) {
  const { totalSeconds, runningEntry } = summary;
  const [liveSeconds, setLiveSeconds] = React.useState(() =>
    runningEntry ? Math.floor((Date.now() - new Date(runningEntry.startedAt).getTime()) / 1000) : 0
  );

  React.useEffect(() => {
    if (!runningEntry) return;
    const tick = () => setLiveSeconds(Math.floor((Date.now() - new Date(runningEntry.startedAt).getTime()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Clock className="size-4 text-text-muted" aria-hidden="true" />
        <span>
          Total: <span className="font-medium text-text-primary">{formatDuration(totalSeconds)}</span>
        </span>
      </div>

      {canTrack && (
        <div className="flex items-center gap-2">
          {runningEntry ? (
            <Button variant="destructive" size="sm" onClick={onStop}>
              <Square className="size-3.5" />
              Stop · {formatDuration(liveSeconds)}
            </Button>
          ) : (
            <>
              {onAddManualEntry && (
                <Button variant="secondary" size="sm" onClick={onAddManualEntry}>
                  Add time
                </Button>
              )}
              <Button size="sm" onClick={onStart}>
                <Play className="size-3.5" />
                Start timer
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
