"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Profile, WorkspaceSummary } from "@/lib/auth/session";

export interface SessionValue {
  profile: Profile | null;
  workspaces: WorkspaceSummary[];
}

const Ctx = createContext<SessionValue>({ profile: null, workspaces: [] });

/**
 * The signed-in user, resolved once on the server and handed to the
 * client tree.
 *
 * The alternative — every client component fetching the user itself —
 * means a request per component and a flash of signed-out UI on each
 * one. Reading it once in the root layout means the shell renders with
 * the right name on the first paint.
 */
export function SessionProvider({ value, children }: { value: SessionValue; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  return useContext(Ctx);
}
