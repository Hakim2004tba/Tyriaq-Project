"use client";

import { useEffect, useState } from "react";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ImageOff } from "lucide-react";
import { signDocumentImage } from "@/lib/actions/document-image";

/**
 * An image held in private storage.
 *
 * What is stored in the document is the object's PATH, never a URL. A
 * signed URL expires, so persisting one would leave a document full of
 * dead images within the hour; a public URL would never expire, which
 * is worse — a private document's images would stay readable by anyone
 * who ever copied an address, long after losing access to the page.
 *
 * So the path is resolved to a fresh signed URL when the node renders.
 */
function DocumentImageView({ node }: NodeViewProps) {
  const path = node.attrs.path as string | null;
  const alt = (node.attrs.alt as string) ?? "";
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) return;
    let live = true;
    void signDocumentImage(path).then((result) => {
      if (!live) return;
      if (result.url) setSrc(result.url);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [path]);

  return (
    <NodeViewWrapper className="my-4">
      {failed ? (
        <span className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-body-sm text-text-muted">
          <ImageOff className="size-4" aria-hidden="true" />
          This image is no longer available.
        </span>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="max-h-[32rem] w-auto max-w-full rounded-lg border border-border"
        />
      ) : (
        <span className="block h-40 w-full animate-pulse rounded-lg border border-border bg-surface-muted" />
      )}
    </NodeViewWrapper>
  );
}

export const DocumentImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      /** Object path inside the `document-images` bucket. */
      path: { default: null },
      alt: { default: "" },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentImageView);
  },
});
