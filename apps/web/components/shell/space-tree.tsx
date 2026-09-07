"use client";

import Link from "next/link";
import { ChevronRight, Plus, Settings2 } from "lucide-react";
import { IconButton, SidebarSection } from "@flow/ui";
import { cn } from "@flow/utils";
import { SpaceBadge } from "@/components/spaces/space-badge";
import { useSpaces } from "@/components/spaces/space-store";
import { PROJECT_STATUS_META } from "@/lib/data/types";

/**
 * The sidebar hierarchy: Workspace → Space → Project.
 *
 * Rows are indented by depth rather than nested in scroll containers, so
 * the whole tree scrolls as one list — nested scrollbars in a 264px rail
 * are how navigation stops feeling like navigation.
 *
 * Only the disclosure triangle toggles; the row itself navigates. A row
 * that does both makes every attempt to open a space a coin flip between
 * expanding it and leaving the page.
 */

const INDENT = [10, 26] as const;

function Row({
  depth,
  active,
  href,
  onToggle,
  expanded,
  hasChildren,
  leading,
  label,
  trailing,
  onClick,
}: {
  depth: 0 | 1;
  active?: boolean;
  href: string;
  onToggle?: () => void;
  expanded?: boolean;
  hasChildren?: boolean;
  leading: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="relative flex items-center" style={{ paddingLeft: INDENT[depth] }}>
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
          aria-hidden="true"
        />
      )}

      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          className="flex size-4 shrink-0 items-center justify-center rounded text-sidebar-text-muted
                     transition-colors hover:text-sidebar-text focus-visible:outline-none focus-visible:shadow-focus"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform duration-fast", expanded && "rotate-90")}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className="size-4 shrink-0" aria-hidden="true" />
      )}

      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "group/row flex min-w-0 flex-1 items-center gap-2 rounded-md py-[6px] pl-1 pr-2 text-body-sm font-medium",
          "transition-colors duration-fast ease-emphasized",
          "focus-visible:outline-none focus-visible:shadow-focus",
          active
            ? "bg-sidebar-active-bg text-sidebar-active-text"
            : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text"
        )}
      >
        {leading}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {trailing}
      </Link>
    </div>
  );
}

export function SpaceTree({
  collapsed,
  activeSpace,
  activeProject,
  onNavigate,
  onCreateSpace,
}: {
  collapsed?: boolean;
  activeSpace?: string;
  activeProject?: string;
  onNavigate?: () => void;
  onCreateSpace?: () => void;
}) {
  const store = useSpaces();

  // Collapsed rail: badges only. There is no room for a tree at 72px, and
  // a truncated one would just be a puzzle.
  if (collapsed) {
    return (
      <SidebarSection label="Spaces" collapsed>
        {store.active.map((s) => (
          <Link
            key={s.id}
            href={`/spaces/${s.slug}`}
            title={s.name}
            onClick={onNavigate}
            className={cn(
              "mx-auto flex size-9 items-center justify-center rounded-md transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:shadow-focus",
              activeSpace === s.slug ? "bg-sidebar-active-bg" : "hover:bg-sidebar-hover"
            )}
          >
            <SpaceBadge icon={s.icon} color={s.color} size="xs" />
          </Link>
        ))}
      </SidebarSection>
    );
  }

  return (
    <SidebarSection
      label="Spaces"
      action={
        <IconButton
          label="Create space"
          size="sm"
          onClick={onCreateSpace}
          className="size-5 rounded text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text"
        >
          <Plus className="size-3.5" />
        </IconButton>
      }
    >
      {store.active.length === 0 && (
        <p className="px-2.5 py-2 text-caption text-sidebar-text-muted">
          No spaces yet — create one to get started.
        </p>
      )}

      {store.active.map((space) => {
        const open = store.expanded.has(space.id);
        const projects = store.projectsBySpace.get(space.id) ?? [];

        return (
          <div key={space.id} className="flex flex-col gap-0.5">
            <Row
              depth={0}
              href={`/spaces/${space.slug}`}
              active={activeSpace === space.slug}
              hasChildren={projects.length > 0}
              expanded={open}
              onToggle={() => store.toggleExpanded(space.id)}
              onClick={onNavigate}
              leading={<SpaceBadge icon={space.icon} color={space.color} size="xs" />}
              label={space.name}
              trailing={
                <span className="shrink-0 text-caption tabular text-sidebar-text-muted">
                  {projects.length}
                </span>
              }
            />

            {open &&
              projects.map((p) => (
                <Row
                  key={p.id}
                  depth={1}
                  href={`/projects/${p.slug}`}
                  active={activeProject === p.slug}
                  onClick={onNavigate}
                  leading={
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        PROJECT_STATUS_META[p.status].dot
                      )}
                      aria-hidden="true"
                    />
                  }
                  label={p.name}
                />
              ))}
          </div>
        );
      })}

      <Link
        href="/spaces"
        onClick={onNavigate}
        className="mt-0.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-caption text-sidebar-text-muted
                   transition-colors hover:text-sidebar-text focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Settings2 className="size-3.5" aria-hidden="true" />
        Manage spaces
      </Link>
    </SidebarSection>
  );
}
