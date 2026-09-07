import * as React from "react";
import { File, FileImage, FileText, FileSpreadsheet, Presentation, Download, X } from "lucide-react";
import type { FileRef } from "@flow/types";
import type { FileCategory } from "@flow/types";
import { formatFileSize, cn } from "@flow/utils";
import { IconButton } from "../button/icon-button";
import { Avatar } from "../avatar/avatar";

const CATEGORY_ICONS: Record<FileCategory, React.ElementType> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  other: File,
};

export interface FileItemProps extends React.HTMLAttributes<HTMLDivElement> {
  file: FileRef;
  /** Icon reflects the file's category (image/pdf/spreadsheet/etc) when
   * provided — falls back to a generic file icon otherwise. */
  category?: FileCategory;
  uploaderName?: string | null;
  uploaderAvatarUrl?: string | null;
  onDownload?: () => void;
  onRemove?: () => void;
}

export function FileItem({
  file,
  category = "other",
  uploaderName,
  uploaderAvatarUrl,
  onDownload,
  onRemove,
  className,
  ...props
}: FileItemProps) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-surface-muted",
        className
      )}
      {...props}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-text-secondary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-body-sm font-medium text-text-primary">{file.name}</span>
        <span className="flex items-center gap-1.5 text-caption text-text-muted">
          {formatFileSize(file.sizeBytes)}
          {uploaderName && (
            <>
              <span aria-hidden="true">·</span>
              <Avatar name={uploaderName} src={uploaderAvatarUrl} size="xs" />
              {uploaderName}
            </>
          )}
        </span>
      </span>
      {onDownload && (
        <IconButton label={`Download ${file.name}`} onClick={onDownload}>
          <Download className="size-4" />
        </IconButton>
      )}
      {onRemove && (
        <IconButton label={`Remove ${file.name}`} onClick={onRemove}>
          <X className="size-4" />
        </IconButton>
      )}
    </div>
  );
}
