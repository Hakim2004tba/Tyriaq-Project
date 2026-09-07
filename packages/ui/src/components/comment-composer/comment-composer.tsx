import * as React from "react";
import { Textarea } from "../textarea/textarea";
import { Button } from "../button/button";
import { MentionPicker, type MentionableUser, type MentionPickerHandle } from "../mention-picker/mention-picker";

export interface CommentComposerProps {
  /** Who can be @mentioned here — supplied by the parent, which knows
   * the workspace/task/document context. This component never fetches
   * users itself. */
  mentionableUsers: MentionableUser[];
  onSubmit: (content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  autoFocus?: boolean;
  /** Smaller sizing for reply/edit composers nested inside a thread. */
  compact?: boolean;
}

/** Finds the "@query" fragment immediately before the cursor, if any —
 * the trigger for showing MentionPicker. */
function getActiveMentionQuery(value: string, cursor: number): { start: number; query: string } | null {
  const upToCursor = value.slice(0, cursor);
  const match = /(?:^|\s)@([a-zA-Z0-9_.-]*)$/.exec(upToCursor);
  if (!match) return null;
  const query = match[1] ?? "";
  const start = cursor - query.length - 1; // position of "@"
  return { start, query };
}

export function CommentComposer({
  mentionableUsers,
  onSubmit,
  onCancel,
  placeholder = "Write a comment…",
  submitLabel = "Comment",
  initialValue = "",
  autoFocus = false,
  compact = false,
}: CommentComposerProps) {
  const [value, setValue] = React.useState(initialValue);
  const [pending, setPending] = React.useState(false);
  const [mention, setMention] = React.useState<{ start: number; query: string } | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const pickerRef = React.useRef<MentionPickerHandle>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setValue(next);
    const cursor = e.target.selectionStart ?? next.length;
    setMention(getActiveMentionQuery(next, cursor));
  }

  function insertMention(user: MentionableUser) {
    if (!mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + mention.query.length + 1);
    const next = `${before}@${user.name} ${after}`;
    setValue(next);
    setMention(null);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && pickerRef.current?.handleKeyDown(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key === "Escape" && mention) {
      setMention(null);
    }
  }

  function computeMentionedUserIds(content: string): string[] {
    const ids: string[] = [];
    for (const user of mentionableUsers) {
      if (content.includes(`@${user.name}`)) ids.push(user.id);
    }
    return ids;
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onSubmit(trimmed, computeMentionedUserIds(trimmed));
      setValue("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        autoFocus={autoFocus}
      />

      {mention && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <MentionPicker ref={pickerRef} users={mentionableUsers} query={mention.query} onSelect={insertMention} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleSubmit} loading={pending} disabled={!value.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
