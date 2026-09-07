"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@flow/utils";
import type { DocumentContent } from "@flow/types";
import { IconButton } from "../button/icon-button";
import { Skeleton } from "../skeleton/skeleton";

export interface DocumentEditorProps {
  /** Which document this editor instance represents. Content only resets
   * to the `content` prop when this changes (e.g. navigating to a
   * different document) — never on every prop update, so it doesn't
   * fight the user's in-progress typing or cursor position. */
  documentId: string;
  content: DocumentContent;
  /** Fires on every real content change with the editor's current
   * structured JSON. This component never calls a save function itself
   * — debouncing and persistence are the caller's responsibility
   * (see apps/web .../document-detail-client.tsx), so the save
   * strategy can change without touching the editor. */
  onChange: (content: DocumentContent) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Structured ProseMirror/Tiptap JSON in, structured JSON out — never
 * HTML. The `DocumentContent` type in @flow/types is intentionally
 * loose (`{ type: "doc"; content?: unknown[] }`) so Tiptap's internal
 * node/mark types never leak into the shared domain model; this file is
 * the one place that imports Tiptap's real types.
 */
export function DocumentEditor({
  documentId,
  content,
  onChange,
  editable = true,
  placeholder = "Write something…",
  className,
}: DocumentEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({ placeholder }),
      ],
      content: content as unknown as Record<string, unknown>,
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        onChange(e.getJSON() as DocumentContent);
      },
      editorProps: {
        attributes: {
          class: "prose-document focus:outline-none",
        },
      },
    },
    // Recreate only when switching documents — content resets are
    // handled explicitly below, not by editor recreation on every
    // keystroke.
    [documentId]
  );

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * The formatting toolbar (bold/italic/headings/lists/etc). Kept as an
 * internal, non-exported part of DocumentEditor rather than a separate
 * @flow/ui primitive — it's tightly coupled to a live Tiptap Editor
 * instance and isn't meaningfully reusable outside this component,
 * unlike DocumentToolbar (the page-level search/create toolbar), which
 * is exported separately.
 */
function EditorToolbar({ editor }: { editor: Editor }) {
  const [, forceUpdate] = React.useReducer((c) => c + 1, 0);

  React.useEffect(() => {
    editor.on("selectionUpdate", forceUpdate);
    editor.on("transaction", forceUpdate);
    return () => {
      editor.off("selectionUpdate", forceUpdate);
      editor.off("transaction", forceUpdate);
    };
  }, [editor]);

  const items: { label: string; icon: React.ElementType; active: boolean; onClick: () => void }[] = [
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), onClick: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: UnderlineIcon, active: editor.isActive("underline"), onClick: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strikethrough", icon: Strikethrough, active: editor.isActive("strike"), onClick: () => editor.chain().focus().toggleStrike().run() },
    { label: "Heading 1", icon: Heading1, active: editor.isActive("heading", { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, active: editor.isActive("heading", { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: Heading3, active: editor.isActive("heading", { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", icon: List, active: editor.isActive("bulletList"), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Blockquote", icon: Quote, active: editor.isActive("blockquote"), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", icon: Code, active: editor.isActive("codeBlock"), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Divider", icon: Minus, active: false, onClick: () => editor.chain().focus().setHorizontalRule().run() },
    {
      label: "Link",
      icon: LinkIcon,
      active: editor.isActive("link"),
      onClick: () => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        // eslint-disable-next-line no-alert
        const url = window.prompt("Link URL", previousUrl ?? "");
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-surface p-1">
      {items.map((item) => (
        <IconButton
          key={item.label}
          label={item.label}
          variant={item.active ? "secondary" : "ghost"}
          onClick={item.onClick}
        >
          <item.icon className="size-4" />
        </IconButton>
      ))}
    </div>
  );
}
