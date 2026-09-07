import * as React from "react";
import { Paperclip } from "lucide-react";
import type { AttachmentWithUploader } from "@flow/types";
import { getFileCategory } from "@flow/types";
import { FileItem } from "../file-item/file-item";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";

export interface AttachmentListProps {
  attachments: AttachmentWithUploader[];
  loading?: boolean;
  /** Whether the current viewer may remove a given attachment (own
   * upload, or a workspace moderator) — computed by the parent, which
   * knows the current user id and workspace role. */
  canRemove: (attachment: AttachmentWithUploader) => boolean;
  onDownload: (attachment: AttachmentWithUploader) => void;
  onRemove: (attachment: AttachmentWithUploader) => void;
}

/** A pure list renderer over already-fetched attachment metadata — no
 * upload UI (that's AttachmentUploader) and no Supabase Storage calls of
 * its own; onDownload/onRemove are the parent's responsibility. */
export function AttachmentList({ attachments, loading, canRemove, onDownload, onRemove }: AttachmentListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <EmptyState icon={<Paperclip className="size-5" />} title="No files yet" description="Attach files relevant to this item." />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <FileItem
          key={attachment.id}
          file={{ id: attachment.id, name: attachment.fileName, sizeBytes: attachment.fileSize ?? 0, mimeType: attachment.mimeType ?? "" }}
          category={getFileCategory(attachment.mimeType)}
          uploaderName={attachment.uploader.fullName}
          uploaderAvatarUrl={attachment.uploader.avatarUrl}
          onDownload={() => onDownload(attachment)}
          onRemove={canRemove(attachment) ? () => onRemove(attachment) : undefined}
        />
      ))}
    </div>
  );
}
