import type { Person } from "./task-types";

export type ConversationKind = "dm" | "group" | "project";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** What to show in the list: a group's name, the other person, the project. */
  title: string;
  projectId: string | null;
  projectSlug: string | null;
  members: Person[];
  /** For a DM, the person who is not you. */
  counterpart: Person | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  /** False for a project channel the viewer has read but not joined. */
  joined: boolean;
  muted: boolean;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  canRemove: boolean;
  pending?: boolean;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  /** Whether the viewer is one of them — drives the highlighted state. */
  mine: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: Person;
  body: string;
  createdAt: string;
  edited: boolean;
  mine: boolean;
  canDelete: boolean;
  replyToId: string | null;
  /** Enough of the parent to render the quoted line without another read. */
  replyTo: { id: string; authorName: string; body: string } | null;
  mentions: string[];
  taskRefs: string[];
  projectRefs: string[];
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  /** Set while an optimistic message has not been acknowledged. */
  pending?: boolean;
}

/** Live data a message's chips resolve against, never copied into the body. */
export interface ChatContext {
  people: Person[];
  tasks: { id: string; title: string; status: string; projectSlug: string | null }[];
  projects: { id: string; name: string; slug: string }[];
}

export const REACTION_CHOICES = ["👍", "🎉", "👀", "✅", "❤️", "🙏"] as const;

/**
 * Splits a body into text, `@mentions`, `#tasks` and `+projects`.
 *
 * The body stores display text so a sentence still reads when something
 * is deleted; the ids on the message are what the chips resolve against.
 * Matching is longest-name-first so "@Alice Ait" wins over "@Alice".
 */
export type BodyPart =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; id: string }
  | { kind: "task"; text: string; id: string }
  | { kind: "project"; text: string; id: string };

export function parseBody(
  body: string,
  context: ChatContext,
  refs: { mentions: string[]; taskRefs: string[]; projectRefs: string[] }
): BodyPart[] {
  type Ref = { kind: "mention" | "task" | "project"; id: string };
  const tokens: { token: string; part: Ref }[] = [];

  for (const id of refs.mentions) {
    const person = context.people.find((p) => p.id === id);
    if (person) tokens.push({ token: `@${person.name}`, part: { kind: "mention", id } });
  }
  for (const id of refs.taskRefs) {
    const task = context.tasks.find((t) => t.id === id);
    if (task) tokens.push({ token: `#${task.title}`, part: { kind: "task", id } });
  }
  for (const id of refs.projectRefs) {
    const project = context.projects.find((p) => p.id === id);
    if (project) tokens.push({ token: `+${project.name}`, part: { kind: "project", id } });
  }

  tokens.sort((a, b) => b.token.length - a.token.length);

  const parts: BodyPart[] = [];
  let rest = body;

  while (rest.length > 0) {
    let best: { index: number; token: string; part: Ref } | null = null;
    for (const candidate of tokens) {
      const index = rest.indexOf(candidate.token);
      if (index === -1) continue;
      // Earliest match wins; ties go to the longer token, which the sort
      // above already put first.
      if (!best || index < best.index) best = { index, token: candidate.token, part: candidate.part };
    }
    if (!best) break;

    if (best.index > 0) parts.push({ kind: "text", text: rest.slice(0, best.index) });
    parts.push({ ...best.part, text: best.token } as BodyPart);
    rest = rest.slice(best.index + best.token.length);
  }

  if (rest.length > 0) parts.push({ kind: "text", text: rest });
  return parts;
}

/**
 * Day separators.
 *
 * Compared on local calendar date, not on elapsed hours — two messages
 * eleven hours apart can be on different days, and two an hour apart can
 * straddle midnight.
 */
export function isSameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(iso, today.toISOString())) return "Today";
  if (isSameDay(iso, yesterday.toISOString())) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Mirrors a reaction toggle locally, so the chip moves under the cursor.
 *
 * Shared by both places chat is rendered — the standalone workspace and
 * a project's own channel — because two copies of "what a click does to
 * a count" is two chances for them to disagree.
 */
export function applyReaction(
  reactions: ChatMessage["reactions"],
  emoji: string,
  add: boolean,
  mine: boolean
): ChatMessage["reactions"] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (add) {
    if (!existing) return [...reactions, { emoji, count: 1, mine }];
    return reactions.map((r) =>
      r.emoji === emoji ? { ...r, count: r.count + 1, mine: mine || r.mine } : r
    );
  }
  if (!existing) return reactions;
  if (existing.count <= 1) return reactions.filter((r) => r.emoji !== emoji);
  return reactions.map((r) =>
    r.emoji === emoji ? { ...r, count: r.count - 1, mine: mine ? false : r.mine } : r
  );
}

