"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Settings2, UserPlus, Users, X } from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Button,
  EmptyState,
  SectionCard,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import { PERMISSION_META, PERMISSION_ORDER, type PermissionLevel } from "@/lib/data/permissions";
import { PermissionBadge, PermissionPicker } from "./permission-badge";
import {
  addSpaceMember,
  removeSpaceMember,
  setSpaceMemberLevel,
} from "@/lib/actions/space-member";
import { setProjectLevel } from "@/lib/actions/space-link";
import type { PermissionsOverview, SpaceRow } from "@/lib/data/permissions-data";

/**
 * People & permissions, over the real workspace.
 *
 * This screen was a prototype over sample people while the model was
 * being designed; every level shown here is now a row in the database,
 * and every control writes one.
 *
 * The shape of the page is unchanged on purpose — Workspace → Space →
 * Project, with the reference card explaining the four levels — because
 * that shape was the point of designing it first.
 */
export function PermissionsLive({ overview }: { overview: PermissionsOverview }) {
  const [spaces, setSpaces] = useState(overview.spaces);
  const [viewAs, setViewAs] = useState(overview.viewerId);
  const [, startTransition] = useTransition();

  const peopleById = useMemo(
    () => new Map(overview.people.map((person) => [person.id, person])),
    [overview.people]
  );
  const viewer = peopleById.get(viewAs) ?? overview.people[0];

  /**
   * What one person may do on one project, after both grants.
   *
   * The same resolution the database does in `project_level()`: a
   * workspace admin is an admin everywhere, then an explicit project
   * grant, then the space. A project grant wins even when it is WEAKER
   * than the space — that is what makes "editor in Marketing, viewer on
   * this one" expressible at all.
   */
  function resolve(
    personId: string,
    space: SpaceRow,
    projectId: string
  ): { level: PermissionLevel | null; source: "workspace" | "space" | "project" } {
    const person = peopleById.get(personId);
    if (person?.role === "owner" || person?.role === "admin") {
      return { level: "admin", source: "workspace" };
    }
    const project = space.projects.find((p) => p.id === projectId);
    const override = project?.overrides.find((o) => o.personId === personId);
    if (override) return { level: override.level, source: "project" };

    const member = space.members.find((m) => m.personId === personId);
    if (member) return { level: member.level, source: "space" };

    return { level: null, source: "space" };
  }

  /* ----------------------------- writes ----------------------------- */

  function changeSpaceLevel(space: SpaceRow, personId: string, level: PermissionLevel) {
    const previous = spaces;
    setSpaces((current) =>
      current.map((s) =>
        s.id !== space.id
          ? s
          : { ...s, members: s.members.map((m) => (m.personId === personId ? { ...m, level } : m)) }
      )
    );
    startTransition(async () => {
      const result = await setSpaceMemberLevel(space.id, personId, level);
      if (result.error) {
        setSpaces(previous);
        toast.error(result.error);
      }
    });
  }

  function addToSpace(space: SpaceRow, personId: string, level: PermissionLevel) {
    const previous = spaces;
    setSpaces((current) =>
      current.map((s) =>
        s.id !== space.id ? s : { ...s, members: [...s.members, { personId, level }] }
      )
    );
    startTransition(async () => {
      const result = await addSpaceMember(space.id, personId, level);
      if (result.error) {
        setSpaces(previous);
        toast.error(result.error);
      }
    });
  }

  function removeFromSpace(space: SpaceRow, personId: string) {
    const previous = spaces;
    setSpaces((current) =>
      current.map((s) =>
        s.id !== space.id ? s : { ...s, members: s.members.filter((m) => m.personId !== personId) }
      )
    );
    startTransition(async () => {
      const result = await removeSpaceMember(space.id, personId);
      if (result.error) {
        setSpaces(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Removed from the space. Any project overrides they had still stand.");
    });
  }

  /**
   * Sets or clears a project override.
   *
   * Clearing is not removal: it hands the person back whatever the space
   * grants, which is a different intention from taking their access
   * away, and the row keeps following the space afterwards.
   */
  function changeProjectLevel(
    space: SpaceRow,
    projectId: string,
    personId: string,
    level: PermissionLevel | null
  ) {
    const previous = spaces;
    setSpaces((current) =>
      current.map((s) =>
        s.id !== space.id
          ? s
          : {
              ...s,
              projects: s.projects.map((project) =>
                project.id !== projectId
                  ? project
                  : {
                      ...project,
                      overrides: level
                        ? [
                            ...project.overrides.filter((o) => o.personId !== personId),
                            { personId, level },
                          ]
                        : project.overrides.filter((o) => o.personId !== personId),
                    }
              ),
            }
      )
    );
    startTransition(async () => {
      const result = await setProjectLevel(projectId, personId, level);
      if (result.error) {
        setSpaces(previous);
        toast.error(result.error);
      }
    });
  }

  if (overview.people.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <EmptyState
          icon={<Users className="size-5" />}
          title="Nobody here yet"
          description="Invite somebody to the workspace, or share a space link, and they will show up here."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-text-primary">People &amp; permissions</h1>
          <p className="mt-1 text-body text-text-secondary">
            Workspace → Space → Project. A grant made higher up flows down, and a project can
            override it.
          </p>
        </div>

        {/*
          "View as" is the fastest way to check a permission model:
          rather than reasoning about who can see what, look at it as
          them. It reads the same rows the database does, so what it
          shows is what they would actually get.
        */}
        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
          <span className="shrink-0 text-caption text-text-muted">View as</span>
          <select
            value={viewAs}
            onChange={(e) => setViewAs(e.target.value)}
            className="min-w-0 bg-transparent text-body-sm text-text-primary outline-none"
          >
            {overview.people.map((person) => (
              <option key={person.id} value={person.id} className="bg-surface-elevated">
                {person.name} · {person.role}
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* ----------------------- the levels ----------------------- */}
      <SectionCard title="The four levels" subtitle="What each one can do">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...PERMISSION_ORDER].reverse().map((level) => {
            const meta = PERMISSION_META[level];
            return (
              <li
                key={level}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3"
              >
                <PermissionBadge level={level} className="self-start" />
                <p className="text-body-sm text-text-primary">{meta.summary}</p>
                <ul className="flex flex-col gap-1">
                  {meta.can.map((line) => (
                    <li key={line} className="flex gap-1.5 text-caption text-text-muted">
                      <span aria-hidden="true">·</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {/* ----------------------- spaces ----------------------- */}
      {spaces.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title="No spaces yet"
          description="Permissions are granted per space. Make one, and it will appear here."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {spaces.map((space) => {
            const chip = SPACE_COLOR[space.color];
            const notIn = overview.people.filter(
              (person) => !space.members.some((m) => m.personId === person.id)
            );

            return (
              <div key={space.id} className="flex flex-col gap-3">
                <SectionCard
                  title={
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold ring-1 ring-inset",
                          chip.chip,
                          chip.text
                        )}
                        aria-hidden="true"
                      >
                        {space.name.slice(0, 1).toUpperCase()}
                      </span>
                      {space.name}
                    </span>
                  }
                  subtitle={`${space.members.length} ${
                    space.members.length === 1 ? "person" : "people"
                  } · ${space.projects.length} ${
                    space.projects.length === 1 ? "project" : "projects"
                  }`}
                  action={
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/spaces/${space.slug}?members=1`}>
                        <UserPlus className="size-3.5" />
                        Add or share
                      </Link>
                    </Button>
                  }
                >
                  {space.members.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-3 py-4 text-body-sm text-text-muted">
                      Nobody is in this space yet. Everyone still sees it if they are a workspace
                      admin.
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {space.members.map((member) => {
                        const person = peopleById.get(member.personId);
                        if (!person) return null;
                        return (
                          <li key={member.personId} className="flex items-center gap-2.5 py-2">
                            <Avatar
                              name={person.name}
                              src={person.avatarUrl ?? undefined}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-body-sm text-text-primary">
                                {person.name}
                              </span>
                              <span className="block truncate text-caption text-text-muted">
                                {person.role === "owner" || person.role === "admin"
                                  ? `Workspace ${person.role} — admin everywhere regardless`
                                  : "In every project here, unless a project overrides it"}
                              </span>
                            </span>

                            <PermissionPicker
                              level={member.level}
                              source="space"
                              disabled={!space.canManage}
                              onChange={(next) => changeSpaceLevel(space, member.personId, next)}
                            />

                            {space.canManage && (
                              <button
                                type="button"
                                onClick={() => removeFromSpace(space, member.personId)}
                                aria-label={`Remove ${person.name} from ${space.name}`}
                                className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted
                                           transition-colors hover:bg-danger-subtle hover:text-danger
                                           focus-visible:outline-none focus-visible:shadow-focus"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {space.canManage && notIn.length > 0 && (
                    <details className="mt-2 rounded-md border border-border">
                      <summary className="cursor-pointer px-2.5 py-2 text-body-sm text-text-secondary">
                        Add somebody from the workspace ({notIn.length})
                      </summary>
                      <ul className="flex flex-col divide-y divide-border border-t border-border">
                        {notIn.map((person) => (
                          <li key={person.id} className="flex items-center gap-2.5 px-2.5 py-2">
                            <Avatar
                              name={person.name}
                              src={person.avatarUrl ?? undefined}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">
                              {person.name}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => addToSpace(space, person.id, "editor")}
                            >
                              Add as editor
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </SectionCard>

                {/* ------------------ projects in it ------------------ */}
                <SectionCard
                  title={`Projects in ${space.name}`}
                  subtitle="Each can override what the space grants"
                >
                  {space.projects.length === 0 ? (
                    <p className="text-body-sm text-text-muted">No projects in this space yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {space.projects.map((project) => {
                        const mine = viewer
                          ? resolve(viewer.id, space, project.id)
                          : { level: null as PermissionLevel | null, source: "space" as const };

                        const audience = space.members
                          .map((member) => peopleById.get(member.personId))
                          .filter((person): person is NonNullable<typeof person> => Boolean(person));

                        return (
                          <li key={project.id} className="flex flex-col gap-2 py-2.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="min-w-0 flex-1">
                                <Link
                                  href={`/projects/${project.slug}`}
                                  className="block truncate text-body-sm text-text-primary hover:underline"
                                >
                                  {project.name}
                                </Link>
                                <span className="block truncate text-caption text-text-muted">
                                  {project.overrides.length > 0
                                    ? `${project.overrides.length} override${
                                        project.overrides.length === 1 ? "" : "s"
                                      }`
                                    : "Everyone inherits the space"}
                                </span>
                              </span>

                              <AvatarGroup
                                people={audience.slice(0, 5).map((person) => ({
                                  id: person.id,
                                  name: person.name,
                                  avatarUrl: person.avatarUrl,
                                }))}
                                max={4}
                                size="sm"
                              />

                              <span className="flex shrink-0 items-center gap-1.5">
                                <span className="text-caption text-text-muted">
                                  {viewer?.id === overview.viewerId ? "You:" : `${viewer?.name}:`}
                                </span>
                                {mine.level ? (
                                  <PermissionBadge level={mine.level} source={mine.source} />
                                ) : (
                                  <span className="text-caption text-text-muted">No access</span>
                                )}
                              </span>
                            </div>

                            {/*
                              The overrides are listed under the project
                              rather than hidden behind a dialog: an
                              exception nobody can see is an exception
                              nobody remembers making.
                            */}
                            {space.canManage && (
                              <ul className="flex flex-col gap-1 pl-3">
                                {space.members.map((member) => {
                                  const person = peopleById.get(member.personId);
                                  if (!person) return null;
                                  const override = project.overrides.find(
                                    (o) => o.personId === member.personId
                                  );

                                  return (
                                    <li
                                      key={member.personId}
                                      className="flex items-center gap-2 text-caption"
                                    >
                                      <ChevronRight
                                        className="size-3 shrink-0 text-text-muted"
                                        aria-hidden="true"
                                      />
                                      <span className="min-w-0 flex-1 truncate text-text-secondary">
                                        {person.name}
                                      </span>
                                      {override ? (
                                        <>
                                          <PermissionPicker
                                            level={override.level}
                                            source="project"
                                            onChange={(next) =>
                                              changeProjectLevel(
                                                space,
                                                project.id,
                                                member.personId,
                                                next
                                              )
                                            }
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              changeProjectLevel(
                                                space,
                                                project.id,
                                                member.personId,
                                                null
                                              )
                                            }
                                            className="rounded px-1 text-text-muted transition-colors
                                                       hover:text-text-secondary focus-visible:outline-none
                                                       focus-visible:shadow-focus"
                                          >
                                            Inherit
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            changeProjectLevel(
                                              space,
                                              project.id,
                                              member.personId,
                                              member.level === "viewer" ? "editor" : "viewer"
                                            )
                                          }
                                          className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5
                                                     text-text-muted transition-colors hover:bg-white/[0.04]
                                                     focus-visible:outline-none focus-visible:shadow-focus"
                                        >
                                          <Settings2 className="size-3" aria-hidden="true" />
                                          Set separately
                                        </button>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SectionCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
