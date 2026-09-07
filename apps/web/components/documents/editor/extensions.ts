"use client";

import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import type { AnyExtension } from "@tiptap/core";
import { DocumentImage } from "./document-image";
import { TaskLink, type TaskLookup } from "./task-link";
import { UserMention } from "./mention-node";
import type { SuggestionOptions } from "@tiptap/suggestion";

/**
 * The document's schema.
 *
 * Deliberately finite. Every node here is one the product can render,
 * store and search — there is no HTML passthrough, no arbitrary
 * embedding and no raw pasted markup, because a shared document that can
 * carry anything is a way to run anything in a colleague's session.
 */
export function documentExtensions(options: {
  taskLookup: TaskLookup;
  mentionSuggestion: Omit<SuggestionOptions, "editor">;
  taskSuggestion: Omit<SuggestionOptions, "editor">;
}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Supplied separately below so they can be configured.
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      // `javascript:` and friends never become links, however the text
      // was typed or pasted.
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: {
        class: "text-primary underline underline-offset-2 hover:text-primary-strong",
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading" ? "Heading" : "Write, or press @ to mention and # to link a task…",
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    DocumentImage,
    TaskLink.configure({
      lookup: options.taskLookup,
      suggestion: options.taskSuggestion,
    }),
    UserMention.configure({ suggestion: options.mentionSuggestion }),
  ];
}
