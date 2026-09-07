import type { JSX, ReactNode } from "react";
import { AppFrame } from "@/components/shell";
import { requireWorkspace } from "@/lib/auth/session";

/**
 * Guards this area at the data layer.
 *
 * The middleware already redirects requests without a session, but the
 * check is repeated here on purpose: middleware is one matcher edit away
 * from not covering a route, and a layout that assumes a user renders
 * whatever it holds to whoever asks.
 */
export default async function AreaLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  await requireWorkspace();
  return <AppFrame>{children}</AppFrame>;
}
