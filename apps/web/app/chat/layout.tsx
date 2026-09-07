import type { JSX, ReactNode } from "react";
import { AppFrame } from "@/components/shell";
import { requireWorkspace } from "@/lib/auth/session";

export default async function ChatLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  await requireWorkspace();
  return <AppFrame>{children}</AppFrame>;
}
