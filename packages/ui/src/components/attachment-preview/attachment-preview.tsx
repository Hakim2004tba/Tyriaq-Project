import * as React from "react";
import { FileImage, FileText, FileSpreadsheet, Presentation, File } from "lucide-react";
import type { AttachmentWithUploader, FileCategory } from "@flow/types";
import { getFileCategory } from "@flow/types";
import { formatFileSize, cn } from "@flow/utils";

const CATEGORY_ICONS: Record<FileCategory, React.ElementType> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  other: File,
};

export interface AttachmentPreviewProps {
  attachment: AttachmentWithUploader;
  /** A signed/public URL for the image, resolved by the parent (which
   * owns the Supabase Storage client) — this component never fetches
   * one itself. Only used when the attachment is an image; ignored
   * otherwise. */
  previewUrl?: string | null;
  onClick?: () => void;
  className?: string;
}

/** Shows an image thumbnail when a previewUrl is supplied for an image
 * attachment; otherwise falls back to a category icon + filename/size —
 * never attempts to render unsupported file types inline (brief:
 * "for unsupported previews, show the file icon and metadata"). */
export function AttachmentPreview({ attachment, previewUrl, onClick, className }: AttachmentPreviewProps) {
  const category = getFileCategory(attachment.mimeType);
  const Icon = CATEGORY_ICONS[category];

  if (category === "image" && previewUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "block h-32 w-32 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={attachment.fileName} className="size-full object-cover" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface-muted p-3 text-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      <Icon className="size-8 text-text-muted" aria-hidden="true" />
      <span className="w-full truncate text-caption text-text-secondary">{attachment.fileName}</span>
      <span className="text-caption text-text-muted">{formatFileSize(attachment.fileSize ?? 0)}</span>
    </button>
  );
}
