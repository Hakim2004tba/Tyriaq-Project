import * as React from "react";
import { MoreHorizontal, SmilePlus } from "lucide-react";
import type { CommentWithAuthor, ReactionEmoji } from "@flow/types";
import { REACTION_EMOJIS } from "@flow/types";
import { formatRelativeTime, cn } from "@flow/utils";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../dropdown-menu/dropdown-menu";
import { CommentComposer } from "../comment-composer/comment-composer";
import type { MentionableUser } from "../mention-picker/mention-picker";

export interface CommentItemProps {
  comment: CommentWithAuthor;
  isOwn: boolean;
  canDelete: boolean;
  onReply?: () => void;
  onEdit: (content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  /** Toggles the viewer's own reaction with this emoji — adds it if not
   * already present, removes it if it is (the caller owns which). */
  onToggleReaction: (emoji: ReactionEmoji) => void | Promise<void>;
  mentionableUsers: MentionableUser[];
}

export function CommentItem({ comment, isOwn, canDelete, onReply, onEdit, onDelete, onToggleReaction, mentionableUsers }: CommentItemProps) {
  const [editing, setEditing] = React.useState(false);
  const isDeleted = Boolean(comment.deletedAt);

  if (isDeleted) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Avatar name={comment.author.fullName || "Unnamed"} src={comment.author.avatarUrl} size="sm" className="opacity-50" />
        <p className="pt-1 text-body-sm italic text-text-muted">This comment was deleted.</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Avatar name={comment.author.fullName || "Unnamed"} src={comment.author.avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <CommentComposer
            mentionableUsers={mentionableUsers}
            initialValue={comment.content}
            submitLabel="Save"
            autoFocus
            compact
            onCancel={() => setEditing(false)}
            onSubmit={async (content, mentionedUserIds) => {
              await onEdit(content, mentionedUserIds);
              setEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 py-2">
      <Avatar name={comment.author.fullName || "Unnamed"} src={comment.author.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-body-sm font-medium text-text-primary">{comment.author.fullName || "Unnamed"}</span>
          <span className="text-caption text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && <span className="text-caption text-text-muted">· edited</span>}
        </div>
        <CommentBody content={comment.content} />

        {comment.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {comment.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction(r.emoji)}
                aria-pressed={r.reactedByViewer}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-caption transition-colors",
                  r.reactedByViewer
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-muted"
                )}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-3 text-caption text-text-muted">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Add reaction"
                className="opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
              >
                <SmilePlus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex w-auto gap-0.5 p-1">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  aria-label={`React with ${emoji}`}
                  className="flex size-7 items-center justify-center rounded-md text-body hover:bg-surface-muted"
                >
                  {emoji}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {onReply && (
            <button type="button" onClick={onReply} className="font-medium hover:text-text-primary">
              Reply
            </button>
          )}
          {(isOwn || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Comment actions" className="size-5">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {isOwn && <DropdownMenuItem onSelect={() => setEditing(true)}>Edit</DropdownMenuItem>}
                {canDelete && (
                  <DropdownMenuItem destructive onSelect={() => onDelete()}>
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBody({ content }: { content: string }) {
  const parts = content.split(/(@[a-zA-Z0-9_.-]+(?: [a-zA-Z0-9_.-]+)?)/g);
  return (
    <p className="whitespace-pre-wrap text-body-sm text-text-secondary">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className={cn("font-medium text-primary")}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}
