"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Local text that saves itself shortly after typing stops.
 *
 * A title or description bound straight to the store would send one
 * write per keystroke — dozens of requests to rename a task, each one
 * able to arrive out of order. Holding the text locally and flushing it
 * on a pause keeps typing instant and the writes few.
 *
 * The pending text is also flushed when the component goes away, so
 * closing the panel mid-sentence saves rather than discards.
 */
export function useDraft(
  value: string,
  save: (next: string) => void,
  delay = 600
): [string, (next: string) => void, () => void] {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // An external change — another view, or a different task in the same
  // panel — replaces the draft, unless the user is mid-edit.
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    saveRef.current(draftRef.current);
  }, []);

  const onChange = useCallback(
    (next: string) => {
      dirty.current = true;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        dirty.current = false;
        timer.current = null;
        saveRef.current(next);
      }, delay);
    },
    [delay]
  );

  useEffect(() => flush, [flush]);

  return [draft, onChange, flush];
}
