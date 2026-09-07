"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@flow/utils";
import { toast } from "@flow/ui";

/**
 * The formatting bar.
 *
 * Sticky at the top of the editor column rather than floating over the
 * selection: a bubble menu hides the text it is anchored to, and this
 * document surface is meant to be quiet enough to read in.
 */
export function EditorToolbar({
  editor,
  onInsertImage,
}: {
  editor: Editor;
  onInsertImage: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link address", previous ?? "https://");
    if (href === null) return;

    if (href.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Anything that is not plainly http(s) or mailto is refused rather
    // than "cleaned up": a javascript: URL in a shared document is a
    // way to run code in a colleague's session.
    const safe = /^(https?:|mailto:)/i.test(href.trim())
      ? href.trim()
      : `https://${href.trim().replace(/^\/+/, "")}`;
    if (!/^(https?:|mailto:)/i.test(safe)) {
      toast.error("Only web and email links can be added.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
  }

  const groups: { key: string; items: ToolbarItem[] }[] = [
    {
      key: "history",
      items: [
        { icon: Undo2, label: "Undo", run: () => editor.chain().focus().undo().run() },
        { icon: Redo2, label: "Redo", run: () => editor.chain().focus().redo().run() },
      ],
    },
    {
      key: "headings",
      items: [
        { icon: Heading1, label: "Heading 1", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
        { icon: Heading2, label: "Heading 2", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
        { icon: Heading3, label: "Heading 3", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
      ],
    },
    {
      key: "marks",
      items: [
        { icon: Bold, label: "Bold", run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
        { icon: Italic, label: "Italic", run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
        { icon: Strikethrough, label: "Strikethrough", run: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
        { icon: Code, label: "Inline code", run: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
        { icon: Link2, label: "Link", run: setLink, active: editor.isActive("link") },
      ],
    },
    {
      key: "blocks",
      items: [
        { icon: List, label: "Bullet list", run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
        { icon: ListOrdered, label: "Numbered list", run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
        { icon: ListChecks, label: "Checklist", run: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList") },
        { icon: Quote, label: "Quote", run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
        { icon: Code2, label: "Code block", run: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
      ],
    },
    {
      key: "inserts",
      items: [
        {
          icon: TableIcon,
          label: "Table",
          run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
        { icon: ImageIcon, label: "Image", run: () => fileRef.current?.click() },
      ],
    },
  ];

  return (
    <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 border-b border-border bg-background/85 px-1 py-1.5 backdrop-blur-xl">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onInsertImage(file);
          e.target.value = "";
        }}
      />

      {groups.map((group, gi) => (
        <div key={group.key} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />}
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.run}
                aria-label={item.label}
                title={item.label}
                aria-pressed={item.active ?? undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  item.active
                    ? "bg-primary-muted text-primary"
                    : "text-text-muted hover:bg-white/5 hover:text-text-primary"
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface ToolbarItem {
  icon: typeof Bold;
  label: string;
  run: () => void;
  active?: boolean;
}
