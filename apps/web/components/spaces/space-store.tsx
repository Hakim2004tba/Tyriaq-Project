"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Project, Space, Workspace } from "@/lib/data/types";

/**
 * Navigation data for the shell.
 *
 * The rows themselves come from the server — the root layout reads them
 * once and hands them down, so the sidebar paints with real spaces on the
 * first frame rather than fetching on mount and flashing empty.
 *
 * What stays client-side is only the *view* state: which spaces are
 * expanded. That is per-person, per-session, and belongs nowhere near the
 * database.
 */
export interface SpaceStore {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  spaces: Space[];
  active: Space[];
  archived: Space[];
  projectsBySpace: Map<string, Project[]>;
  getSpace: (slug: string) => Space | undefined;

  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
}

const Ctx = createContext<SpaceStore | null>(null);

export function useSpaces(): SpaceStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSpaces must be used inside <SpaceStoreProvider>");
  return v;
}

export interface SpaceStoreData {
  workspaces: Workspace[];
  spaces: Space[];
  projects: Project[];
}

export function SpaceStoreProvider({
  data,
  children,
}: {
  data: SpaceStoreData;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo<SpaceStore>(() => {
    const projectsBySpace = new Map<string, Project[]>();
    for (const p of data.projects) {
      if (p.archived) continue;
      const list = projectsBySpace.get(p.spaceId);
      if (list) list.push(p);
      else projectsBySpace.set(p.spaceId, [p]);
    }

    return {
      workspaces: data.workspaces,
      currentWorkspace: data.workspaces[0] ?? null,
      spaces: data.spaces,
      active: data.spaces.filter((s) => !s.archived),
      archived: data.spaces.filter((s) => s.archived),
      projectsBySpace,
      getSpace: (slug) => data.spaces.find((s) => s.slug === slug),
      expanded,
      toggleExpanded,
    };
  }, [data, expanded, toggleExpanded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
