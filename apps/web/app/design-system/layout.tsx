import type { JSX, ReactNode } from "react";
import { AppFrame } from "@/components/shell";

/**
 * The canon renders inside the real shell rather than on a bare page —
 * a design system reviewed on a white void proves nothing about how it
 * behaves against the aurora, the rail and the top bar.
 *
 * Not auth-gated: it documents the design language and holds no
 * workspace data.
 */
export default function DesignSystemLayout({ children }: { children: ReactNode }): JSX.Element {
  return <AppFrame>{children}</AppFrame>;
}
