import * as React from "react";
import type { CommentThread as CommentThreadData, ReactionEmoji } from "@flow/types";
import { CommentItem } from "../comment-item/comment-item";
import { CommentComposer } from "../comment-composer/comment-composer";
import type { MentionableUser } from "../mention-picker/mention-picker";
import { Divider } from "../divider/divider";

export interface CommentThreadProps {
  thread: CommentThreadData;
  currentUserId: string;
  /** True if the current viewer may moderate (delete) ANY comment in
   * this workspace — combined with per-comment authorship to compute
   * each CommentItem's actual delete permission. */
  isModerator: boolean;
  mentionableUsers: MentionableUser[];
  onEditComment: (commentId: string, content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
  onReply: (content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void | Promise<void>;
}

/** One top-level comment plus its (at most one level deep) replies —
 * matches the "Comment → Reply, Reply" shape enforced by the database. */
export function CommentThread({
  thread,
  currentUserId,
  isModerator,
  mentionableUsers,
  onEditComment,
  onDeleteComment,
  onReply,
  onToggleReaction,
}: CommentThreadProps) {
  const [replying, setReplying] = React.useState(false);

  return (
    <div className="flex flex-col gap-1">
      <CommentItem
        comment={thread.comment}
        isOwn={thread.comment.authorId === currentUserId}
        canDelete={thread.comment.authorId === currentUserId || isModerator}
        mentionableUsers={mentionableUsers}
        onReply={() => setReplying((v) => !v)}
        onEdit={(content, mentionedUserIds) => onEditComment(thread.comment.id, content, mentionedUserIds)}
        onDelete={() => onDeleteComment(thread.comment.id)}
        onToggleReaction={(emoji) => onToggleReaction(thread.comment.id, emoji)}
      />

      {thread.replies.length > 0 && (
        <div className="ml-10 flex flex-col divide-y divide-border/60 border-l border-border pl-4">
          {thread.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isOwn={reply.authorId === currentUserId}
              canDelete={reply.authorId === currentUserId || isModerator}
              mentionableUsers={mentionableUsers}
              onEdit={(content, mentionedUserIds) => onEditComment(reply.id, content, mentionedUserIds)}
              onDelete={() => onDeleteComment(reply.id)}
              onToggleReaction={(emoji) => onToggleReaction(reply.id, emoji)}
            />
          ))}
        </div>
      )}

      {replying && (
        <div className="ml-10 border-l border-border pl-4 pt-2">
          <CommentComposer
            mentionableUsers={mentionableUsers}
            placeholder="Write a reply…"
            submitLabel="Reply"
            autoFocus
            compact
            onCancel={() => setReplying(false)}
            onSubmit={async (content, mentionedUserIds) => {
              await onReply(content, mentionedUserIds);
              setReplying(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export interface CommentThreadListProps {
  threads: CommentThreadData[];
  currentUserId: string;
  isModerator: boolean;
  mentionableUsers: MentionableUser[];
  onEditComment: CommentThreadProps["onEditComment"];
  onDeleteComment: CommentThreadProps["onDeleteComment"];
  onReply: (parentId: string, content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onToggleReaction: CommentThreadProps["onToggleReaction"];
}

/** Renders every top-level thread for a task/document, separated by a
 * subtle divider. */
export function CommentThreadList({
  threads,
  currentUserId,
  isModerator,
  mentionableUsers,
  onEditComment,
  onDeleteComment,
  onReply,
  onToggleReaction,
}: CommentThreadListProps) {
  return (
    <div className="flex flex-col">
      {threads.map((thread, i) => (
        <React.Fragment key={thread.comment.id}>
          {i > 0 && <Divider className="my-2" />}
          <CommentThread
            thread={thread}
            currentUserId={currentUserId}
            isModerator={isModerator}
            mentionableUsers={mentionableUsers}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onReply={(content, mentionedUserIds) => onReply(thread.comment.id, content, mentionedUserIds)}
            onToggleReaction={onToggleReaction}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
