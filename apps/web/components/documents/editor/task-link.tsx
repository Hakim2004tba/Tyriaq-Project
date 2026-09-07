"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, CircleDot, CircleSlash } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * A live reference to a task.
 *
 * The node stores ONE thing: the task's id. Its title and status are
 * read from the task itself every time the document is opened, so
 * renaming a task updates every document that mentions it and a closed
 * task reads as closed everywhere — which is the difference between
 * referencing work and describing it.
 *
 * The title in `attrs` is a fallback for when the task cannot be
 * resolved (it was deleted, or lives in a project the reader cannot
 * see). Without it the sentence would collapse to an empty chip and
 * lose its meaning entirely.
 */

export interface TaskLookup {
  get: (id: string) => { title: string; status: string; projectSlug: string | null } | undefined;
}

const STATUS_ICON: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: CircleDot,
  review: CircleDashed,
  done: CheckCircle2,
  blocked: CircleSlash,
};

const STATUS_TONE: Record<string, string> = {
  todo: "text-text-muted",
  in_progress: "text-primary",
  review: "text-warning",
  done: "text-success",
  blocked: "text-danger",
};

function TaskLinkView({ node, extension }: NodeViewProps) {
  const id = node.attrs.id as string;
  const fallback = (node.attrs.title as string) || "Task";
  const lookup = extension.options.lookup as TaskLookup | undefined;
  const task = lookup?.get(id);

  const status = task?.status ?? "todo";
  const Icon = STATUS_ICON[status] ?? Circle;
  const label = task?.title ?? fallback;

  const chip = (
    <span
      className={cn(
        "inline-flex max-w-[22rem] items-center gap-1.5 rounded-md border border-border bg-surface-muted",
        "px-1.5 py-0.5 align-baseline text-[0.9em] transition-colors",
        task ? "hover:border-border-strong" : "opacity-70"
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", STATUS_TONE[status])} aria-hidden="true" />
      <span className={cn("truncate", status === "done" && "line-through decoration-text-muted")}>
        {label}
      </span>
      {!task && <span className="shrink-0 text-caption text-text-muted">(unavailable)</span>}
    </span>
  );

  return (
    <NodeViewWrapper as="span" className="inline">
      {task?.projectSlug ? (
        <Link
          href={`/projects/${task.projectSlug}?task=${id}`}
          // The editor owns the selection; a click here means "go to the
          // task", so the drag/selection handling is stood down for it.
          draggable={false}
          className="no-underline"
        >
          {chip}
        </Link>
      ) : (
        chip
      )}
    </NodeViewWrapper>
  );
}

export const TaskLink = Node.create({
  name: "taskLink",
  group: "inline",
  inline: true,
  atom: true,
  draggable: false,

  addOptions() {
    return {
      lookup: undefined as TaskLookup | undefined,
      suggestion: undefined as Omit<SuggestionOptions, "editor"> | undefined,
    };
  },

  addAttributes() {
    return {
      id: { default: null },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-task-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // Only the id is persisted as an attribute the database can find —
    // `document_task_ids` looks for exactly this node type and attr.
    return ["span", mergeAttributes({ "data-task-link": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskLinkView);
  },

  /**
   * `#` opens the task picker.
   *
   * A separate plugin key from the mention menu, or the two suggestions
   * would share state and typing `#` would reopen whichever menu ran
   * last.
   */
  addProseMirrorPlugins() {
    const suggestion = this.options.suggestion;
    if (!suggestion) return [];
    return [
      Suggestion({
        editor: this.editor,
        char: "#",
        pluginKey: new PluginKey("taskLinkSuggestion"),
        allowSpaces: true,
        ...suggestion,
      }),
    ];
  },
});
