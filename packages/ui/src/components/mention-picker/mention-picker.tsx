import * as React from "react";
import { cn } from "@flow/utils";
import { Avatar } from "../avatar/avatar";

export interface MentionableUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface MentionPickerHandle {
  /** Called from the host textarea's onKeyDown so arrow keys/Enter work
   * while focus stays in the textarea. Returns true if the key was
   * consumed (caller should preventDefault and stop propagation). */
  handleKeyDown: (key: string) => boolean;
}

export interface MentionPickerProps {
  /** The parent decides who is mentionable (workspace members, project
   * members, etc) — this component has no idea what a Task or Document
   * is, let alone how to fetch users for one. */
  users: MentionableUser[];
  query: string;
  onSelect: (user: MentionableUser) => void;
  className?: string;
}

/** A small inline autocomplete list, positioned by the caller (typically
 * absolutely, anchored under a textarea's caret). Filters `users` by
 * `query` client-side — no data fetching of its own. */
export const MentionPicker = React.forwardRef<MentionPickerHandle, MentionPickerProps>(
  ({ users, query, onSelect, className }, ref) => {
    const [activeIndex, setActiveIndex] = React.useState(0);

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return users.slice(0, 6);
      return users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 6);
    }, [users, query]);

    React.useEffect(() => setActiveIndex(0), [query]);

    React.useImperativeHandle(
      ref,
      () => ({
        handleKeyDown(key: string) {
          if (filtered.length === 0) return false;
          if (key === "ArrowDown") {
            setActiveIndex((i) => (i + 1) % filtered.length);
            return true;
          }
          if (key === "ArrowUp") {
            setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
            return true;
          }
          if (key === "Enter" || key === "Tab") {
            const user = filtered[activeIndex];
            if (user) onSelect(user);
            return true;
          }
          return false;
        },
      }),
      [filtered, activeIndex, onSelect]
    );

    if (filtered.length === 0) return null;

    return (
      <div
        role="listbox"
        aria-label="Mention a person"
        className={cn(
          "z-50 max-h-56 w-56 overflow-y-auto rounded-md border border-border bg-surface-elevated p-1 shadow-md",
          className
        )}
      >
        {filtered.map((user, index) => (
          <button
            key={user.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(user)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-body-sm text-text-primary",
              index === activeIndex ? "bg-surface-muted" : "hover:bg-surface-muted"
            )}
          >
            <Avatar name={user.name} src={user.avatarUrl} size="xs" />
            {user.name}
          </button>
        ))}
      </div>
    );
  }
);
MentionPicker.displayName = "MentionPicker";
