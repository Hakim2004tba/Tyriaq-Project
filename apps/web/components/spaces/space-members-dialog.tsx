"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Copy, Mail, Search, UserPlus, X } from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { PermissionPicker } from "@/components/permissions/permission-badge";
import { PERMISSION_META, type PermissionLevel } from "@/lib/data/permissions";
import { inviteToWorkspace } from "@/lib/actions/invitation";
import {
  addSpaceMember,
  removeSpaceMember,
  setSpaceMemberLevel,
} from "@/lib/actions/space-member";
import type { Member } from "@/lib/data/types";

export interface SpaceMemberEntry {
  member: Member;
  level: PermissionLevel;
}

/**
 * Who is in this space, and at what level.
 *
 * Everything here is stored: adding somebody writes a `space_members`
 * row, and the level is what every project in the space inherits.
 *
 * Somebody who is not in the workspace yet cannot be added to a space —
 * the database refuses it — so typing an address that nobody holds
 * offers an INVITATION instead. That is the honest order of operations:
 * join the workspace, then the space.
 */
export function SpaceMembersDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  workspaceMembers,
  entries,
  onChange,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  workspaceMembers: Member[];
  entries: SpaceMemberEntry[];
  onChange: (next: SpaceMemberEntry[]) => void;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<PermissionLevel>("editor");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement | null>(null);

  const inSpace = useMemo(() => new Set(entries.map((e) => e.member.id)), [entries]);

  // Listed before anybody types, so the way in is visible rather than
  // hidden behind knowing to search.
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaceMembers
      .filter((member) => !inSpace.has(member.id))
      .filter(
        (member) =>
          !q ||
          member.name.toLowerCase().includes(q) ||
          (member.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [inSpace, query, workspaceMembers]);

  const trimmed = query.trim();
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);

  function add(member: Member) {
    // Optimistic: the row appears, and rolls back if the write is refused.
    const previous = entries;
    onChange([...entries, { member, level }]);
    setQuery("");
    searchRef.current?.focus();

    startTransition(async () => {
      const result = await addSpaceMember(spaceId, member.id, level);
      if (result.error) {
        onChange(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`${member.name} added as ${PERMISSION_META[level].label.toLowerCase()}.`);
    });
  }

  function changeLevel(entry: SpaceMemberEntry, next: PermissionLevel) {
    const previous = entries;
    onChange(entries.map((e) => (e.member.id === entry.member.id ? { ...e, level: next } : e)));
    startTransition(async () => {
      const result = await setSpaceMemberLevel(spaceId, entry.member.id, next);
      if (result.error) {
        onChange(previous);
        toast.error(result.error);
      }
    });
  }

  function remove(entry: SpaceMemberEntry) {
    const previous = entries;
    onChange(entries.filter((e) => e.member.id !== entry.member.id));
    startTransition(async () => {
      const result = await removeSpaceMember(spaceId, entry.member.id);
      if (result.error) {
        onChange(previous);
        toast.error(result.error);
      }
    });
  }

  function invite() {
    startTransition(async () => {
      const result = await inviteToWorkspace(trimmed);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.url ?? null);
      setCopied(false);
      toast.success(result.message ?? "Invitation ready.");
    });
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is on screen to select.
      toast.info("Select the link and copy it.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Members of {spaceName}</DialogTitle>
          <DialogDescription>
            People here reach every project in this space, unless a project overrides it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {canManage && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                  <Input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search workspace members…"
                    aria-label="Search workspace members"
                    className="pl-8"
                  />
                </div>
                <PermissionPicker level={level} source="space" onChange={setLevel} />
              </div>

              <ul className="max-h-48 overflow-y-auto rounded-md border border-border">
                {candidates.length === 0 ? (
                  <li className="px-2.5 py-2">
                    {looksLikeEmail ? (
                      <button
                        type="button"
                        onClick={invite}
                        disabled={pending}
                        className="flex w-full items-center gap-2.5 rounded-md text-left transition-colors
                                   hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/5"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                          <Mail className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-text-primary">
                            Invite {trimmed} to the workspace
                          </span>
                          <span className="block text-caption text-text-muted">
                            They join the workspace first, then you can add them here
                          </span>
                        </span>
                      </button>
                    ) : (
                      <p className="text-body-sm text-text-muted">
                        {trimmed
                          ? "Nobody in the workspace matches that. Type a full email address to invite somebody new."
                          : workspaceMembers.length <= 1
                            ? "You are the only person here yet. Type an email address to invite somebody."
                            : "Everybody in the workspace is already in this space."}
                      </p>
                    )}
                  </li>
                ) : (
                  candidates.map((member) => (
                    <li key={member.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => add(member)}
                        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors
                                   hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/5"
                      >
                        <Avatar name={member.name} src={member.avatarUrl ?? undefined} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-text-primary">{member.name}</span>
                          {member.email && (
                            <span className="block truncate text-caption text-text-muted">{member.email}</span>
                          )}
                        </span>
                        <UserPlus className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}

          <div className="flex flex-col gap-1">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm font-medium text-text-primary">In this space</span>
              <span className="text-caption text-text-muted">
                {entries.length} {entries.length === 1 ? "person" : "people"}
              </span>
            </p>

            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-body-sm text-text-muted">
                Nobody yet. Add somebody above and choose what they can do.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {entries.map((entry) => (
                  <li key={entry.member.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <Avatar name={entry.member.name} src={entry.member.avatarUrl ?? undefined} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm text-text-primary">
                        {entry.member.name}
                      </span>
                      <span className="block truncate text-caption text-text-muted">
                        {PERMISSION_META[entry.level].summary}
                      </span>
                    </span>

                    <PermissionPicker
                      level={entry.level}
                      source="space"
                      disabled={!canManage}
                      onChange={(next) => changeLevel(entry, next)}
                    />

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => remove(entry)}
                        aria-label={`Remove ${entry.member.name}`}
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted",
                          "transition-colors hover:bg-danger-subtle hover:text-danger",
                          "focus-visible:outline-none focus-visible:shadow-focus"
                        )}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/*
            The link is shown rather than mailed. Tyriaq has no mail
            provider yet, and a screen claiming "invitation sent" while
            nothing left the building would be the worst of both.
          */}
          {inviteUrl && (
            <div className="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-primary-muted/40 px-3 py-2.5">
              <p className="text-body-sm font-medium text-text-primary">
                Send them this link
              </p>
              <p className="text-caption text-text-muted">
                It only works for the address you invited, and expires in 14 days.
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Invitation link"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-caption
                             text-text-secondary outline-none focus-visible:shadow-focus"
                />
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
