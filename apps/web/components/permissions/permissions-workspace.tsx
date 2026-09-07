"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  FlaskConical,
  Globe,
  Lock,
  Settings2,
  Users,
} from "lucide-react";
import {
  Avatar,
  AvatarGroup,
  Button,
  SectionCard,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { SPACE_COLOR } from "@/components/shell";
import {
  PERMISSION_META,
  PERMISSION_ORDER,
  SAMPLE_PEOPLE,
  SAMPLE_PROJECTS,
  SAMPLE_SPACES,
  VISIBILITY_META,
  projectAudience,
  resolvePermission,
  type PermissionLevel,
  type ProjectVisibility,
  type SamplePerson,
  type SampleProject,
  type SampleSpace,
} from "@/lib/data/permissions";
import { MembersModal } from "./members-modal";
import { PermissionBadge } from "./permission-badge";
import { SpaceMembers } from "./space-members";

const VISIBILITY_ICON: Record<ProjectVisibility, typeof Globe> = {
  workspace: Globe,
  space: Users,
  private: Lock,
};

/**
 * People & permissions, end to end.
 *
 * Everything here runs on sample people held in component state — this
 * phase is the experience and the rules, not the storage. The rules
 * themselves live in `lib/data/permissions.ts` as pure functions, so the
 * policies that eventually enforce them have something exact to match.
 */
export function PermissionsWorkspace() {
  const [people, setPeople] = useState<SamplePerson[]>(SAMPLE_PEOPLE);
  const [spaces, setSpaces] = useState<SampleSpace[]>(SAMPLE_SPACES);
  const [projects, setProjects] = useState<SampleProject[]>(SAMPLE_PROJECTS);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState<string>("p-hakim");

  const viewer = people.find((p) => p.id === viewAs) ?? people[0]!;
  const spaceById = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);

  const project = projects.find((p) => p.id === openProject) ?? null;

  /* ------------------------------- edits ------------------------------ */

  function grant(projectId: string, personId: string, level: PermissionLevel) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              grants: [...p.grants.filter((g) => g.personId !== personId), { personId, level }],
            }
      )
    );
  }

  /**
   * Removing a grant is not the same as removing access.
   *
   * If the person is in the space, taking away the project's override
   * hands them back the inherited permission — which is what "use the
   * inherited permission" means, and why the row does not simply
   * disappear.
   */
  function revoke(projectId: string, personId: string) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : { ...p, grants: p.grants.filter((g) => g.personId !== personId) }
      )
    );
  }

  function setVisibility(projectId: string, visibility: ProjectVisibility) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, visibility } : p)));
  }

  function invite(email: string, level: PermissionLevel, projectId: string) {
    const id = `p-${email.split("@")[0]!.replace(/\W/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    setPeople((prev) => [
      ...prev,
      {
        id,
        name: email.split("@")[0]!.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        // Somebody invited to one project joins as a guest, not a full
        // member — the invitation grants what it says and nothing more.
        workspaceRole: "guest",
        title: "Invited",
        pending: true,
      },
    ]);
    grant(projectId, id, level);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 text-text-primary">People &amp; permissions</h1>
          <p className="mt-1 text-body text-text-secondary">
            Workspace → Space → Project. A grant made higher up flows down, and a project can override it.
          </p>
        </div>

        {/*
          "View as" is the fastest way to check a permission model: rather
          than reasoning about who can see what, look at it as them.
        */}
        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
          <span className="shrink-0 text-caption text-text-muted">View as</span>
          <select
            value={viewAs}
            onChange={(e) => setViewAs(e.target.value)}
            className="min-w-0 bg-transparent text-body-sm text-text-primary outline-none"
          >
            {people.map((person) => (
              <option key={person.id} value={person.id} className="bg-surface-elevated">
                {person.name} · {person.workspaceRole}
              </option>
            ))}
          </select>
        </label>
      </header>

      <p className="flex items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface-muted px-3 py-2.5 text-body-sm text-text-secondary">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
        <span>
          <span className="font-medium text-text-primary">Prototype.</span> These are sample people, held
          in this page while you use it. Nothing here is saved, and it does not touch your real workspace,
          spaces or projects yet.
        </span>
      </p>

      {/* ----------------------- the levels ----------------------- */}
      <SectionCard title="The four levels" subtitle="What each one can do">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...PERMISSION_ORDER].reverse().map((level) => {
            const meta = PERMISSION_META[level];
            return (
              <li key={level} className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
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
      <div className="grid gap-4 xl:grid-cols-2">
        {spaces.map((space) => {
          const spaceProjects = projects.filter((p) => p.spaceId === space.id);
          const viewerHere = space.members.find((m) => m.personId === viewer.id);
          const canManageSpace =
            viewer.workspaceRole === "owner" ||
            viewer.workspaceRole === "admin" ||
            viewerHere?.level === "admin";

          return (
            <div key={space.id} className="flex flex-col gap-3">
              <SpaceMembers
                space={space}
                people={people}
                projectCount={spaceProjects.length}
                canManage={canManageSpace}
                onAdd={(personId, level) =>
                  setSpaces((prev) =>
                    prev.map((s) =>
                      s.id !== space.id
                        ? s
                        : { ...s, members: [...s.members, { personId, level }] }
                    )
                  )
                }
                onChange={(personId, level) =>
                  setSpaces((prev) =>
                    prev.map((s) =>
                      s.id !== space.id
                        ? s
                        : {
                            ...s,
                            members: s.members.map((m) =>
                              m.personId === personId ? { ...m, level } : m
                            ),
                          }
                    )
                  )
                }
                onRemove={(personId) => {
                  setSpaces((prev) =>
                    prev.map((s) =>
                      s.id !== space.id
                        ? s
                        : { ...s, members: s.members.filter((m) => m.personId !== personId) }
                    )
                  );
                  toast.success("Removed from the space. Any project overrides they had still stand.");
                }}
              />

              {/* ------------------ projects in it ------------------ */}
              <SectionCard
                title={`Projects in ${space.name}`}
                subtitle="Each can override what the space grants"
              >
                <ul className="flex flex-col divide-y divide-border">
                  {spaceProjects.map((item) => {
                    const audience = projectAudience(people, item, space);
                    const mine = resolvePermission(viewer, item, space);
                    const Icon = VISIBILITY_ICON[item.visibility];
                    const overrides = item.grants.length;

                    // What the viewer cannot reach is not listed for
                    // them — a permissions screen that shows the name of
                    // a private project has already leaked it.
                    if (mine.level === null) return null;

                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block truncate text-body-sm text-text-primary">
                              {item.name}
                            </span>
                            <span className="block truncate text-caption text-text-muted">
                              {VISIBILITY_META[item.visibility].label}
                              {overrides > 0 && ` · ${overrides} override${overrides === 1 ? "" : "s"}`}
                            </span>
                          </span>
                        </span>

                        <AvatarGroup
                          people={audience.slice(0, 5).map((row) => ({
                            id: row.person.id,
                            name: row.person.name,
                          }))}
                          max={4}
                          size="sm"
                        />

                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="text-caption text-text-muted">You:</span>
                          <PermissionBadge level={mine.level} source={mine.source} />
                        </span>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setOpenProject(item.id)}
                        >
                          <Settings2 className="size-3.5" />
                          Manage
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            </div>
          );
        })}
      </div>

      {/* ------------------ the worked example ------------------ */}
      <SectionCard
        title="One person, three projects"
        subtitle="How the same space membership resolves differently"
      >
        <AhmedExample people={people} spaces={spaces} projects={projects} />
      </SectionCard>

      {project && (
        <MembersModal
          open
          onOpenChange={(next) => !next && setOpenProject(null)}
          project={project}
          space={spaceById.get(project.spaceId)}
          people={people}
          canManage={resolvePermission(viewer, project, spaceById.get(project.spaceId)).level === "admin"}
          onGrant={(personId, level) => grant(project.id, personId, level)}
          onRevoke={(personId) => revoke(project.id, personId)}
          onVisibilityChange={(visibility) => setVisibility(project.id, visibility)}
          onInvite={(email, level) => invite(email, level, project.id)}
        />
      )}
    </div>
  );
}

/**
 * The brief's own example, rendered from the live model rather than
 * written out — change Ahmed's permissions above and this follows.
 */
function AhmedExample({
  people,
  spaces,
  projects,
}: {
  people: SamplePerson[];
  spaces: SampleSpace[];
  projects: SampleProject[];
}) {
  const ahmed = people.find((p) => p.id === "p-ahmed");
  if (!ahmed) return null;

  const rows = projects
    .map((project) => {
      const space = spaces.find((s) => s.id === project.spaceId);
      return { project, space, permission: resolvePermission(ahmed, project, space) };
    })
    .filter((row) => row.permission.level !== null);

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Avatar name={ahmed.name} size="sm" />
        <span>
          <span className="font-medium text-text-primary">{ahmed.name}</span> — {ahmed.title},{" "}
          {ahmed.workspaceRole} of the workspace
        </span>
      </p>

      <ul className="flex flex-col gap-1.5">
        {rows.map(({ project, space, permission }) => {
          const chip = space ? SPACE_COLOR[space.color] : null;
          return (
            <li
              key={project.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-surface-muted px-2.5 py-2"
            >
              {space && chip && (
                <>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold ring-1 ring-inset",
                      chip.chip,
                      chip.text
                    )}
                    aria-hidden="true"
                  >
                    {space.name.slice(0, 1)}
                  </span>
                  <span className="text-caption text-text-muted">{space.name}</span>
                  <ChevronRight className="size-3 shrink-0 text-text-muted" aria-hidden="true" />
                </>
              )}
              <span className="min-w-0 flex-1 truncate text-body-sm text-text-primary">
                {project.name}
              </span>
              <span className="shrink-0 text-caption text-text-muted">{permission.reason}</span>
              <PermissionBadge level={permission.level!} source={permission.source} />
            </li>
          );
        })}
      </ul>

      <p className="text-caption text-text-muted">
        A project grant wins even when it is <em>weaker</em> than the space — that is what makes “Editor
        in Marketing, Viewer on this one” expressible at all.
      </p>
    </div>
  );
}
