"use client";

import { useMemo, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Avatar, AvatarGroup, Badge, Button, Input, SectionCard } from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import {
  type PermissionLevel,
  type SamplePerson,
  type SampleSpace,
} from "@/lib/data/permissions";
import { PermissionPicker } from "./permission-badge";

/**
 * Who is in a space.
 *
 * This is the level most permission grants should be made at: a person
 * added here reaches every project in the space, and the project screens
 * exist for the exceptions. A team that manages access project by
 * project ends up with nobody able to say who can see what.
 */
export function SpaceMembers({
  space,
  people,
  projectCount,
  canManage,
  onAdd,
  onChange,
  onRemove,
}: {
  space: SampleSpace;
  people: SamplePerson[];
  projectCount: number;
  canManage: boolean;
  onAdd: (personId: string, level: PermissionLevel) => void;
  onChange: (personId: string, level: PermissionLevel) => void;
  onRemove: (personId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<PermissionLevel>("editor");
  /*
    The picker starts closed and opens from a visible button.

    Before, the only way in was to type into a search field, which meant
    the whole "add somebody" flow was invisible to anybody who did not
    already know it was there.
  */
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const memberIds = useMemo(() => new Set(space.members.map((m) => m.personId)), [space.members]);
  const chip = SPACE_COLOR[space.color];

  // With no query this suggests everybody not yet in the space, so the
  // list is useful the moment it opens rather than after typing.
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((person) => !memberIds.has(person.id))
      .filter((person) => !q || person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [memberIds, people, query]);

  const members = space.members
    .map((membership) => ({
      membership,
      person: people.find((p) => p.id === membership.personId),
    }))
    .filter((row): row is { membership: typeof row.membership; person: SamplePerson } => Boolean(row.person));

  return (
    <SectionCard
      title={space.name}
      subtitle={`${members.length} ${members.length === 1 ? "member" : "members"} · ${projectCount} ${projectCount === 1 ? "project" : "projects"}`}
      action={
        <span className="flex items-center gap-2">
          <AvatarGroup
            people={members.map((row) => ({ id: row.person.id, name: row.person.name }))}
            max={4}
            size="sm"
          />
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAdding((v) => !v);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              <UserPlus className="size-3.5" />
              Add member
            </Button>
          )}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {canManage && adding && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md text-caption font-bold ring-1 ring-inset",
                chip.chip,
                chip.text
              )}
              aria-hidden="true"
            >
              {space.name.slice(0, 2).toUpperCase()}
            </span>

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
                aria-label={`Add somebody to ${space.name}`}
                className="pl-8"
              />
            </div>

            <PermissionPicker level={level} source="space" onChange={setLevel} />
          </div>
        )}

        {canManage && adding && (
          <ul className="rounded-md border border-border">
            {candidates.length === 0 ? (
              <li className="px-2.5 py-2 text-body-sm text-text-muted">
                {query.trim().length > 0
                  ? "Nobody else in the workspace matches that."
                  : "Everybody in the workspace is already in this space."}
              </li>
            ) : (
              candidates.map((person) => (
                <li key={person.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(person.id, level);
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors
                               hover:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/5"
                  >
                    <Avatar name={person.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-body-sm text-text-primary">{person.name}</span>
                        {person.workspaceRole === "guest" && <Badge variant="neutral" size="sm">Guest</Badge>}
                      </span>
                      <span className="block truncate text-caption text-text-muted">{person.title}</span>
                    </span>
                    <UserPlus className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {members.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-body-sm text-text-muted">
            Nobody has been added to this space yet. Its projects are reachable only through their own
            member lists.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {members.map(({ person, membership }) => (
              <li key={person.id} className="flex items-center gap-2.5 py-2">
                <Avatar name={person.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-body-sm text-text-primary">{person.name}</span>
                    {person.pending && <Badge variant="warning" size="sm">Invited</Badge>}
                  </span>
                  {/* The badge beside this already names the level, so
                      the line says the thing the badge cannot: how far
                      it reaches. */}
                  <span className="block truncate text-caption text-text-muted">
                    In every project in {space.name}, unless a project overrides it
                  </span>
                </span>

                <PermissionPicker
                  level={membership.level}
                  source="space"
                  disabled={!canManage}
                  onChange={(next) => onChange(person.id, next)}
                />

                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRemove(person.id)}
                    aria-label={`Remove ${person.name} from ${space.name}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted
                               transition-colors hover:bg-danger-subtle hover:text-danger
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
