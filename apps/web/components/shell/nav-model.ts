import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  MessagesSquare,
  PenTool,
  Target,
} from "lucide-react";

/**
 * The shell's navigation model.
 *
 * Nav is DATA, not markup: the rail, the mobile drawer and the mobile
 * tab bar all render from these same records, so a destination can never
 * exist on one surface and be missing from another. Adding a product
 * area means adding a row here — not editing three components.
 */
export interface NavEntry {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Unread/pending count rendered as a chrome badge. */
  count?: number;
  /** Surfaced in the mobile tab bar (max 4 + "More"). */
  primary?: boolean;
}

export const WORKSPACE_NAV: NavEntry[] = [
  // Points at the preview dashboard while /app is still on the old,
  // auth-gated shell. Repoint to "/app" when that route adopts AppFrame.
  { id: "home", label: "Home", href: "/dashboard", icon: Home, primary: true },
  { id: "my-tasks", label: "My Tasks", href: "/app/my-tasks", icon: CheckSquare, count: 23, primary: true },
  { id: "projects", label: "Projects", href: "/projects", icon: FolderKanban },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays, primary: true },
  { id: "docs", label: "Documents", href: "/documents", icon: FileText },
  { id: "whiteboards", label: "Whiteboards", href: "/app/whiteboards", icon: PenTool },
  { id: "goals", label: "Goals", href: "/app/goals", icon: Target },
  { id: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { id: "chat", label: "Chat", href: "/chat", icon: MessagesSquare, primary: true },
  { id: "inbox", label: "Inbox", href: "/app/inbox", icon: Inbox, count: 3, primary: true },
];

/** The colour a space is identified by, everywhere it appears. */
export type SpaceColor = "violet" | "blue" | "emerald" | "amber" | "rose" | "cyan";

export const SPACE_COLOR: Record<SpaceColor, { chip: string; text: string }> = {
  violet: { chip: "bg-[#8B5CF6]/20 ring-[#8B5CF6]/40", text: "text-[#C4B5FD]" },
  blue: { chip: "bg-[#60A5FA]/20 ring-[#60A5FA]/40", text: "text-[#93C5FD]" },
  emerald: { chip: "bg-[#34D399]/20 ring-[#34D399]/40", text: "text-[#6EE7B7]" },
  amber: { chip: "bg-[#FBBF24]/20 ring-[#FBBF24]/40", text: "text-[#FCD34D]" },
  rose: { chip: "bg-[#FB7185]/20 ring-[#FB7185]/40", text: "text-[#FDA4AF]" },
  cyan: { chip: "bg-[#2DD4BF]/20 ring-[#2DD4BF]/40", text: "text-[#5EEAD4]" },
};

export interface ShellUser {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}


