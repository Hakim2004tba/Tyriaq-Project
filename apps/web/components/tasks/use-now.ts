"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders once a minute so relative timestamps stay true.
 *
 * A comment posted while the panel is open would otherwise read "just
 * now" for the rest of the session — the label is computed at render,
 * and nothing else re-renders it. A minute is the resolution the labels
 * themselves have, so nothing is gained by ticking faster.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
