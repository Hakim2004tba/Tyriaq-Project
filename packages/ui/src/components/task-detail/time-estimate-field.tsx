import * as React from "react";
import { formatEstimate, parseEstimate } from "@flow/utils";
import { Input } from "../input/input";

export interface TimeEstimateFieldProps {
  /** Current estimate in minutes, or null for none. */
  minutes: number | null;
  disabled?: boolean;
  onChange: (minutes: number | null) => void;
}

/**
 * Free-text effort estimate: the user types "16h", "1h 30m", "90m" or a
 * bare number (read as hours), and on blur it is parsed to minutes and
 * echoed back in canonical form. Parsing lives in @flow/utils so the
 * mobile app applies exactly the same rules.
 *
 * Deliberately not a number input: "how long will this take" is
 * naturally expressed in mixed units, and forcing a raw minute count
 * ("960") is a worse question than the one people actually answer.
 */
export function TimeEstimateField({ minutes, disabled, onChange }: TimeEstimateFieldProps) {
  const canonical = minutes === null ? "" : formatEstimate(minutes);
  const [draft, setDraft] = React.useState(canonical);
  const [invalid, setInvalid] = React.useState(false);

  // Re-sync when the task changes underneath us (switching tasks, or a
  // save landing) — but never while the user is mid-edit, which is why
  // this keys off the canonical value rather than every render.
  React.useEffect(() => {
    setDraft(canonical);
    setInvalid(false);
  }, [canonical]);

  function commit() {
    const trimmed = draft.trim();

    if (!trimmed) {
      setInvalid(false);
      if (minutes !== null) onChange(null);
      return;
    }

    const parsed = parseEstimate(trimmed);
    if (parsed === null) {
      // Keep what they typed so it can be corrected rather than
      // silently discarded, and flag it.
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(formatEstimate(parsed));
    if (parsed !== minutes) onChange(parsed);
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        value={draft}
        disabled={disabled}
        placeholder="e.g. 16h"
        aria-label="Time estimate"
        aria-invalid={invalid || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(canonical);
            setInvalid(false);
          }
        }}
      />
      {invalid && <span className="text-caption text-danger">Try a value like “16h” or “1h 30m”.</span>}
    </div>
  );
}
