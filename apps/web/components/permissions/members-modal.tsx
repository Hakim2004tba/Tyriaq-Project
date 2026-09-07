"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Globe,
  Lock,
  Mail,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  PERMISSION_META,
  VISIBILITY_META,
  projectAudience,
  resolvePermission,
  type PermissionLevel,
  type ProjectVisibility,
  type SamplePerson,
  type SampleProject,
  type SampleSpace,
} from "@/lib/data/permissions";
import { PermissionBadge, PermissionPicker } from "./permission-badge";

const VISIBILITY_ICON: Record<ProjectVisibility, typeof Globe> = {
  workspace: Globe,
  space: Users,
  private: Lock,
};

/**
 * Members & permissions for one project.
 *
 * Two halves, in the order the job is actually done: add people at the
 * top, review who already has access below. A modal that leads with a
 * long list of current members buries the thing it was opened for.
 *
 * Everyone with access is listed, including people who never appear in
 * this project's own grants — a permissions screen that hides inherited
 * access is a permissions screen that lies about who can read the work.
 */
export function MembersModal({
  open,
  onOpenChange,
  project,
  space,
  people,
  canManage,
  onGrant,
  onRevoke,
  onVisibilityChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: SampleProject;
  space: SampleSpace | undefined;
  people: SamplePerson[];
  canManage: boolean;
  onGrant: (personId: string, level: PermissionLevel) => void;
  onRevoke: (personId: string) => void;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
  onInvite: (email: string, level: PermissionLevel) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [level, setLevel] = useState<PermissionLevel>("editor");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const audience = useMemo(
    () => projectAudience(people, project, space),
    [people, project, space]
  );
  const withAccess = useMemo(() => new Set(audience.map((row) => row.person.id)), [audience]);

  const trimmed = query.trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  /*
    The list is always there, with or without a query.

    An earlier version only rendered it once somebody typed, which hid
    the entire add flow behind knowing to type — the Add button sat
    disabled beside an empty field with nothing to explain it. Showing
    who is addable is what makes the feature findable.

    With no query it suggests people who do NOT have access yet, since
    those are the ones there is anything to do about. A search covers
    everybody, including those already on it, so typing a colleague's
    name never produces a confusing empty result.
  */
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) {
      return people.filter((person) => !withAccess.has(person.id)).slice(0, 6);
    }
    return people
      .filter((person) => person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [people, trimmed, withAccess]);

  function toggle(personId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function addSelected() {
    if (selected.size === 0) return;
    for (const personId of selected) onGrant(personId, level);
    const count = selected.size;
    setSelected(new Set());
    setQuery("");
    searchRef.current?.focus();
    toast.success(
      count === 1 ? "1 person added." : `${count} people added as ${PERMISSION_META[level].label.toLowerCase()}s.`
    );
  }

  const VisibilityIcon = VISIBILITY_ICON[project.visibility];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Members &amp; permissions</DialogTitle>
          <DialogDescription>
            Who can reach <span className="text-text-primary">{project.name}</span>, and what they can do.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* ---------------- add people ---------------- */}
          {canManage && (
            <div className="flex flex-col gap-2">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-body-sm font-medium text-text-primary">Add people</span>
                <span className="text-caption text-text-muted">
                  {selected.size > 0
                    ? `${selected.size} selected — set the level, then Add`
                    : "Pick one or more, then press Add"}
                </span>
              </p>
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
                    placeholder="Search people, or type an email address to invite…"
                    aria-label="Search people"
                    className="pl-8"
                  />
                </div>

                <PermissionPicker
                  level={level}
                  source="project"
                  onChange={setLevel}
                  align="end"
                />

                <Button size="md" onClick={addSelected} disabled={selected.size === 0}>
                  <UserPlus className="size-4" />
                  Add{selected.size > 0 ? ` ${selected.size}` : ""}
                </Button>
              </div>

              {selected.size > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {Array.from(selected).map((personId) => {
                    const person = people.find((p) => p.id === personId);
                    if (!person) return null;
                    return (
                      <li
                        key={personId}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted py-0.5 pl-0.5 pr-2"
                      >
                        <Avatar name={person.name} size="xs" />
                        <span className="text-caption text-text-secondary">{person.name}</span>
                        <button
                          type="button"
                          onClick={() => toggle(personId)}
                          aria-label={`Remove ${person.name} from the selection`}
                          className="text-text-muted transition-colors hover:text-danger focus-visible:outline-none"
                        >
                          <X className="size-3" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {(matches.length > 0 || trimmed.length > 0) && (
                <ul className="max-h-52 overflow-y-auto rounded-md border border-border">
                  {matches.map((person) => {
                    const already = withAccess.has(person.id);
                    const on = selected.has(person.id);
                    const existing = resolvePermission(person, project, space);
                    return (
                      <li key={person.id} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggle(person.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                            "focus-visible:outline-none focus-visible:bg-white/5",
                            on ? "bg-primary-muted" : "hover:bg-white/[0.04]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[4px] ring-1 ring-inset",
                              on ? "bg-primary ring-primary text-white" : "ring-border"
                            )}
                            aria-hidden="true"
                          >
                            {on && <Check className="size-3" />}
                          </span>
                          <Avatar name={person.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-body-sm text-text-primary">{person.name}</span>
                              {person.workspaceRole === "guest" && (
                                <Badge variant="neutral" size="sm">Guest</Badge>
                              )}
                              {person.pending && <Badge variant="warning" size="sm">Invited</Badge>}
                            </span>
                            <span className="block truncate text-caption text-text-muted">
                              {person.email} · {person.title}
                            </span>
                          </span>
                          {already && existing.level && (
                            <PermissionBadge level={existing.level} source={existing.source} />
                          )}
                        </button>
                      </li>
                    );
                  })}

                  {/* Somebody who is not here yet. Typing an address is
                      the most natural way to say "this person", so it is
                      offered rather than hidden behind another button. */}
                  {matches.length === 0 && (
                    <li className="px-2.5 py-2">
                      {looksLikeEmail ? (
                        <button
                          type="button"
                          onClick={() => {
                            onInvite(trimmed, level);
                            setQuery("");
                            toast.success(`Invitation queued for ${trimmed}.`);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md text-left transition-colors
                                     hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/5"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                            <Mail className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-sm text-text-primary">
                              Invite {trimmed}
                            </span>
                            <span className="block text-caption text-text-muted">
                              Joins the workspace as a guest, with {PERMISSION_META[level].label.toLowerCase()} access here
                            </span>
                          </span>
                          <Send className="size-3.5 shrink-0 text-text-muted" />
                        </button>
                      ) : (
                        <p className="text-body-sm text-text-muted">
                          {trimmed.length > 0
                            ? "Nobody by that name. Type a full email address to invite somebody new."
                            : "Everybody in the workspace already has access to this project."}
                        </p>
                      )}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* ---------------- visibility ---------------- */}
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <p className="flex items-center gap-2 text-body-sm font-medium text-text-primary">
              <VisibilityIcon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              Who can find this project
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {(Object.keys(VISIBILITY_META) as ProjectVisibility[]).map((option) => {
                const meta = VISIBILITY_META[option];
                const Icon = VISIBILITY_ICON[option];
                const on = project.visibility === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!canManage}
                    onClick={() => onVisibilityChange(option)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed",
                      on ? "bg-primary-muted" : "hover:bg-white/[0.04] disabled:hover:bg-transparent"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                        on ? "bg-primary ring-primary text-white" : "ring-border-strong"
                      )}
                      aria-hidden="true"
                    >
                      {on && <Check className="size-2.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-body-sm text-text-primary">
                        <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                        {meta.label}
                      </span>
                      <span className="block text-caption text-text-muted">{meta.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------- current access ---------------- */}
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm font-medium text-text-primary">
                Who has access
              </span>
              <span className="text-caption text-text-muted">
                {audience.length} {audience.length === 1 ? "person" : "people"}
              </span>
            </p>

            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {audience.map(({ person, permission }) => {
                const level = permission.level!;
                // A workspace owner or admin cannot be demoted here —
                // their standing comes from above the project, and
                // pretending otherwise would show a control that
                // silently does nothing.
                const locked = permission.source === "workspace" && person.workspaceRole !== "member";

                return (
                  <li key={person.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <Avatar name={person.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-body-sm text-text-primary">{person.name}</span>
                        {person.pending && <Badge variant="warning" size="sm">Invited</Badge>}
                        {person.workspaceRole === "guest" && <Badge variant="neutral" size="sm">Guest</Badge>}
                      </span>
                      <span className="block truncate text-caption text-text-muted">
                        {permission.reason}
                      </span>
                    </span>

                    <PermissionPicker
                      level={level}
                      source={permission.source}
                      disabled={!canManage || locked}
                      onChange={(next) => onGrant(person.id, next)}
                      onRevert={permission.source === "project" ? () => onRevoke(person.id) : undefined}
                    />

                    {canManage && !locked && (
                      <button
                        type="button"
                        onClick={() => onRevoke(person.id)}
                        aria-label={`Remove ${person.name}`}
                        title={
                          permission.source === "project"
                            ? "Remove this project's grant"
                            : "Access is inherited — remove it in the space"
                        }
                        disabled={permission.source !== "project"}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted
                                   transition-colors hover:bg-danger-subtle hover:text-danger
                                   disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent
                                   disabled:hover:text-text-muted focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {!canManage && (
              <p className="text-caption text-text-muted">
                You can see who has access. Changing it needs admin on this project.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
