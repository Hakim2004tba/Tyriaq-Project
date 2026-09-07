"use client";

import Link from "next/link";
import { CheckCircle2, Circle, FolderKanban } from "lucide-react";
import { cn } from "@flow/utils";
import { parseBody, type ChatContext } from "@/lib/data/chat-types";

/**
 * A message's text, with its references rendered live.
 *
 * The chips read their title and status from the workspace data passed
 * in — the same rule as documents. A task renamed after the message was
 * sent shows its new name here, and one that has been deleted degrades
 * to the plain words that were typed rather than vanishing mid-sentence.
 */
export function MessageBody({
  body,
  mentions,
  taskRefs,
  projectRefs,
  context,
  viewerId,
}: {
  body: string;
  mentions: string[];
  taskRefs: string[];
  projectRefs: string[];
  context: ChatContext;
  viewerId: string;
}) {
  const parts = parseBody(body, context, { mentions, taskRefs, projectRefs });

  return (
    <p className="whitespace-pre-wrap break-words text-body-sm leading-[20px] text-text-secondary">
      {parts.map((part, i) => {
        if (part.kind === "text") return <span key={i}>{part.text}</span>;

        if (part.kind === "mention") {
          const isMe = part.id === viewerId;
          return (
            <span
              key={i}
              className={cn(
                "rounded-sm px-1 font-medium",
                // Being named yourself is the one thing worth a stronger
                // signal than the rest of the sentence.
                isMe ? "bg-warning-subtle text-warning" : "bg-primary-muted text-primary"
              )}
            >
              {part.text}
            </span>
          );
        }

        if (part.kind === "task") {
          const task = context.tasks.find((t) => t.id === part.id);
          const done = task?.status === "done";
          const Icon = done ? CheckCircle2 : Circle;
          const inner = (
            <span
              className={cn(
                "inline-flex max-w-[18rem] items-center gap-1 rounded-md border border-border bg-surface-muted px-1.5 align-baseline",
                task && "hover:border-border-strong"
              )}
            >
              <Icon
                className={cn("size-3 shrink-0", done ? "text-success" : "text-text-muted")}
                aria-hidden="true"
              />
              <span className={cn("truncate", done && "line-through decoration-text-muted")}>
                {task?.title ?? part.text.slice(1)}
              </span>
            </span>
          );
          return task?.projectSlug ? (
            <Link key={i} href={`/projects/${task.projectSlug}?task=${task.id}`} className="no-underline">
              {inner}
            </Link>
          ) : (
            <span key={i}>{inner}</span>
          );
        }

        const project = context.projects.find((p) => p.id === part.id);
        const chip = (
          <span className="inline-flex max-w-[16rem] items-center gap-1 rounded-md border border-border bg-surface-muted px-1.5 align-baseline">
            <FolderKanban className="size-3 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="truncate">{project?.name ?? part.text.slice(1)}</span>
          </span>
        );
        return project ? (
          <Link key={i} href={`/projects/${project.slug}`} className="no-underline">
            {chip}
          </Link>
        ) : (
          <span key={i}>{chip}</span>
        );
      })}
    </p>
  );
}
