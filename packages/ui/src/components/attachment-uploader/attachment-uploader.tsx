import * as React from "react";
import { Paperclip, X, AlertTriangle } from "lucide-react";
import { formatFileSize, cn } from "@flow/utils";
import { Button } from "../button/button";

export interface AttachmentUploaderProps {
  /** Performs the actual upload (Supabase Storage, validation, the
   * `createAttachmentAction` call, etc) — entirely the parent's
   * responsibility. This component only picks a file and shows
   * progress; it has no idea where the bytes end up. `onProgress` lets
   * the parent report real upload progress if its transport supports
   * it (falls back to an indeterminate state otherwise). */
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
}

interface PendingUpload {
  id: string;
  file: File;
  progress: number;
  error: string | null;
}

export function AttachmentUploader({ onUpload, accept, maxSizeBytes, disabled }: AttachmentUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<PendingUpload[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (maxSizeBytes && file.size > maxSizeBytes) {
        setPending((prev) => [
          ...prev,
          { id: crypto.randomUUID(), file, progress: 0, error: `File is larger than ${formatFileSize(maxSizeBytes)}` },
        ]);
        continue;
      }

      const id = crypto.randomUUID();
      setPending((prev) => [...prev, { id, file, progress: 0, error: null }]);

      try {
        await onUpload(file, (percent) => {
          setPending((prev) => prev.map((p) => (p.id === id ? { ...p, progress: percent } : p)));
        });
        // Success: the parent's own attachment list will now include
        // this file (it owns that state), so this uploader just clears
        // its own transient progress entry.
        setPending((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        setPending((prev) =>
          prev.map((p) => (p.id === id ? { ...p, error: err instanceof Error ? err.message : "Upload failed" } : p))
        );
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        <Paperclip className="size-3.5" />
        Attach file
      </Button>

      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <span className="flex-1 min-w-0 truncate text-body-sm text-text-primary">{item.file.name}</span>
              {item.error ? (
                <span className="flex shrink-0 items-center gap-1 text-caption text-danger">
                  <AlertTriangle className="size-3" />
                  {item.error}
                </span>
              ) : (
                <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={cn("h-full rounded-full bg-primary transition-all duration-base")}
                    style={{ width: `${Math.max(item.progress, 8)}%` }}
                  />
                </div>
              )}
              {item.error && (
                <button
                  type="button"
                  aria-label={`Dismiss ${item.file.name}`}
                  onClick={() => setPending((prev) => prev.filter((p) => p.id !== item.id))}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
