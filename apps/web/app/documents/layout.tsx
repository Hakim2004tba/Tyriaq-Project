import type { JSX, ReactNode } from "react";
import { AppFrame } from "@/components/shell";
import { requireWorkspace } from "@/lib/auth/session";

/**
 * Guards this area at the data layer, as every signed-in area does — the
 * middleware redirect is a convenience, not the boundary.
 */
export default async function DocumentsLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  await requireWorkspace();
  return <AppFrame>{children}</AppFrame>;
}
