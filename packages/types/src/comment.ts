/**
 * Comment domain types (Phase 07). Mirrors supabase/migrations' comments
 * / comment_mentions tables — see supabase/migrations/README.md for the
 * visibility/moderation/threading decisions.
 *
 * Deliberately plain data shapes: no Radix, no Tiptap, no React types.
 * @flow/ui's comment components import these, never the other way
 * around.
 */

/** Minimal author identity — same fullName/avatarUrl shape already used
 * by ProjectMemberWithProfile/TaskAssigneeWithProfile, not a new pattern. */
export interface CommentAuthor {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Mirrors the `comments` table. Plain text content — no rich-text
 * editor for comments in this phase (brief Part 3). */
export interface Comment {
  id: string;
  workspaceId: string;
  authorId: string;
  taskId: string | null;
  documentId: string | null;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A comment joined with its author and the ids of users mentioned in it. */
export interface CommentWithAuthor extends Comment {
  author: CommentAuthor;
  mentionedUserIds: string[];
  /** Pre-aggregated per-emoji counts + whether the viewer reacted —
   * computed once by the data layer, same "don't re-derive in every
   * component" principle as ActivityFeed's already-formatted events. */
  reactions: ReactionSummary[];
}

/** Semantically a reply (parentId is always set) — same shape as
 * CommentWithAuthor, named separately so call sites reading
 * `thread.replies: CommentReply[]` communicate intent without a
 * structurally different type. */
export type CommentReply = CommentWithAuthor;

/** A top-level comment with its (at most one level deep) replies —
 * the shape CommentThread/CommentItem render directly. */
export interface CommentThread {
  comment: CommentWithAuthor;
  replies: CommentReply[];
}

/** Exactly one of taskId/documentId — mirrors the database's single-
 * target check constraint at the type level, so a caller can't
 * accidentally construct an invalid target. */
export type CommentTarget = { taskId: string; documentId?: undefined } | { taskId?: undefined; documentId: string };

/** Mirrors the `comment_mentions` table. */
export interface CommentMention {
  id: string;
  commentId: string;
  userId: string;
}

/** Matches the `reaction_emoji` Postgres enum exactly — a small, fixed
 * set rather than a free-text emoji picker (see supabase/migrations
 * README). */
export const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** Mirrors the `comment_reactions` table. */
export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  emoji: ReactionEmoji;
  createdAt: string;
}

/** One emoji's aggregated reaction count on a comment, plus whether the
 * viewer has reacted with it — the shape a reaction pill actually
 * renders, computed by the caller from the raw CommentReaction rows
 * rather than requiring every consumer to re-aggregate. */
export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  reactedByViewer: boolean;
}
