import * as React from "react";
import { MessageSquare, Activity as ActivityIcon, Paperclip, Sparkles } from "lucide-react";
import type { CommentThread as CommentThreadData, ActivityEventWithActor, AttachmentWithUploader, ReactionEmoji } from "@flow/types";
import { CommentThreadList } from "../comment-thread/comment-thread";
import { CommentComposer } from "../comment-composer/comment-composer";
import type { MentionableUser } from "../mention-picker/mention-picker";
import { ActivityFeed } from "../activity-feed/activity-feed";
import { AttachmentList } from "../attachment-list/attachment-list";
import { AttachmentUploader } from "../attachment-uploader/attachment-uploader";
import { Divider } from "../divider/divider";

export interface CollaborationPanelProps {
  threads: CommentThreadData[];
  activityEvents: ActivityEventWithActor[];
  attachments: AttachmentWithUploader[];
  loading?: boolean;
  currentUserId: string;
  /** May moderate (delete) any comment/attachment in the workspace. */
  isModerator: boolean;
  mentionableUsers: MentionableUser[];
  resolveUserName?: (userId: string) => string;

  onCreateComment: (content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onReplyComment: (parentId: string, content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onEditComment: (commentId: string, content: string, mentionedUserIds: string[]) => void | Promise<void>;
  onDeleteComment: (commentId: string) => void | Promise<void>;
  onToggleReaction: (commentId: string, emoji: ReactionEmoji) => void | Promise<void>;

  onUploadFile: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  onDownloadAttachment: (attachment: AttachmentWithUploader) => void;
  onRemoveAttachment: (attachment: AttachmentWithUploader) => void;
  canRemoveAttachment: (attachment: AttachmentWithUploader) => boolean;
  canUpload: boolean;

  onLoadMoreActivity?: () => void;
  loadingMoreActivity?: boolean;
  hasMoreActivity?: boolean;
}

/**
 * Comments / Activity / Files, in that order — the shared layout used
 * by both Task Detail and Document Detail so the two never end up with
 * divergent collaboration UI or duplicated comment/activity state.
 * Decisions stays out of scope (brief: "do not revive the decision-
 * management concept"), so it isn't rendered here at all rather than
 * kept as a fake placeholder.
 */
export function CollaborationPanel({
  threads,
  activityEvents,
  attachments,
  loading,
  currentUserId,
  isModerator,
  mentionableUsers,
  resolveUserName,
  onCreateComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onToggleReaction,
  onUploadFile,
  onDownloadAttachment,
  onRemoveAttachment,
  canRemoveAttachment,
  canUpload,
  onLoadMoreActivity,
  loadingMoreActivity,
  hasMoreActivity,
}: CollaborationPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Divider />

      <section className="flex flex-col gap-3">
        <SectionHeading icon={<MessageSquare className="size-3.5" />} label="Comments" />
        <CommentComposer mentionableUsers={mentionableUsers} onSubmit={onCreateComment} />
        {!loading && threads.length > 0 && (
          <CommentThreadList
            threads={threads}
            currentUserId={currentUserId}
            isModerator={isModerator}
            mentionableUsers={mentionableUsers}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onReply={onReplyComment}
            onToggleReaction={onToggleReaction}
          />
        )}
      </section>

      <Divider />

      <section className="flex flex-col gap-3">
        <SectionHeading icon={<ActivityIcon className="size-3.5" />} label="Activity" />
        <ActivityFeed
          events={activityEvents}
          loading={loading}
          resolveUserName={resolveUserName}
          onLoadMore={onLoadMoreActivity}
          loadingMore={loadingMoreActivity}
          hasMore={hasMoreActivity}
        />
      </section>

      <Divider />

      <section className="flex flex-col gap-3">
        <SectionHeading icon={<Paperclip className="size-3.5" />} label="Files" />
        <AttachmentList
          attachments={attachments}
          loading={loading}
          canRemove={canRemoveAttachment}
          onDownload={onDownloadAttachment}
          onRemove={onRemoveAttachment}
        />
        {canUpload && <AttachmentUploader onUpload={onUploadFile} maxSizeBytes={25 * 1024 * 1024} />}
      </section>

      <div className="flex items-center gap-1.5 text-caption text-text-muted">
        <Sparkles className="size-3.5" />
        Decisions — coming in a later phase
      </div>
    </div>
  );
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-label text-text-primary">
      {icon}
      {label}
    </div>
  );
}
