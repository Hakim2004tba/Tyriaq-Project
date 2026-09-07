"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CheckSquare,
  FileText,
  FolderKanban,
  HelpCircle,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Target,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  NavigationItem,
  Sidebar,
  SidebarSection,
  TopBar,
  Wordmark,
} from "@flow/ui";
import { useSession } from "@/components/auth/session-provider";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { CommandBar } from "./command-bar";
import { SpaceTree } from "./space-tree";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UpgradeCard } from "./upgrade-card";
import { UserArea } from "./user-area";
import {
  WORKSPACE_NAV,
  type NavEntry,
  type ShellUser,
} from "./nav-model";

export interface AppFrameProps {
  children: ReactNode;
  /** Overrides the value derived from the URL. Rarely needed. */
  activeId?: string;
  nav?: NavEntry[];
  user?: ShellUser;
  /** Optional page-level header rendered directly under the top bar. */
  header?: ReactNode;
}

const MOBILE_QUERY = "(max-width: 1023px)";

/**
 * The Tyriaq application shell.
 *
 * Presentational and fully props-driven — it holds no data fetching and
 * no Supabase import, so the same frame serves the design canon (sample
 * fixtures) and, later, the authenticated app (real rows). Every future
 * product page is a child of this component; none of them should render
 * their own sidebar or top bar.
 *
 * Responsive behaviour has three states rather than two:
 *   ≥1024px  full rail, collapsible to a 72px icon rail
 *   <1024px  rail becomes an off-canvas drawer over a scrim
 *   <768px   plus a bottom tab bar for the four primary destinations
 * The drawer and the tab bar both render from WORKSPACE_NAV, so mobile
 * can never drift out of sync with desktop.
 */
export function AppFrame({
  children,
  activeId,
  nav = WORKSPACE_NAV,
  user,
  header,
}: AppFrameProps) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A drawer left open behind a resize back to desktop would trap the
  // scrim over a layout that no longer needs it.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const railCollapsed = !isMobile && collapsed;
  const primary = nav.filter((n) => n.primary).slice(0, 4);

  /*
    Active state is derived from the URL rather than passed down.

    Every protected layout used to compute it and hand it over, which made
    those layouts client components purely to call
    `useSelectedLayoutSegment` — and a client layout cannot check the
    session on the server. Reading the path here frees all of them to be
    server components again.
  */
  const currentId =
    activeId ??
    [...nav].sort((a, b) => b.href.length - a.href.length).find((n) =>
      n.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === n.href || pathname.startsWith(`${n.href}/`)
    )?.id;
  const spaceMatch = /^\/spaces\/([^/]+)/.exec(pathname);
  const projectMatch = /^\/projects\/([^/]+)/.exec(pathname);
  const activeSpaceSlug = spaceMatch?.[1];
  const activeProjectSlug = projectMatch?.[1];

  // Real session when signed in; the sample identity only shows on
  // surfaces rendered without one (the design canon).
  // Every area behind this shell is auth-guarded, so there is always a
  // real session to read. No placeholder identity — a stand-in name shown
  // during a slow render looks like somebody else is signed in.
  const currentUser: ShellUser = user ?? {
    name: session.profile?.fullName || session.profile?.email || "You",
    email: session.profile?.email ?? "",
    role: session.workspaces[0]?.role === "owner" ? "Workspace owner" : "Workspace member",
    avatarUrl: session.profile?.avatarUrl,
  };

  const rail = (
    <Sidebar collapsed={railCollapsed}>
      {/* Brand + rail toggle */}
      <div className={`flex items-center ${railCollapsed ? "justify-center" : "justify-between"} px-1.5 pb-1 pt-0.5`}>
        <Link
          href="/app"
          className="rounded-md focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="Tyriaq home"
        >
          <Wordmark markOnly={railCollapsed} size={railCollapsed ? 26 : 24} />
        </Link>
        {!railCollapsed &&
          (isMobile ? (
            <IconButton
              label="Close navigation"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              className="text-sidebar-text-muted hover:text-sidebar-text"
            >
              <X className="size-4" />
            </IconButton>
          ) : (
            <IconButton
              label="Collapse sidebar"
              size="sm"
              onClick={() => setCollapsed(true)}
              className="text-sidebar-text-muted hover:text-sidebar-text"
            >
              <PanelLeftClose className="size-4" />
            </IconButton>
          ))}
      </div>

      {/* Create — the rail's single primary action, and the only element
          in the chrome carrying a resting glow. */}
      <div className={`pb-2 pt-2 ${railCollapsed ? "px-0" : "px-1.5"}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {railCollapsed ? (
              <Button variant="primary" size="icon" aria-label="Create" className="mx-auto">
                <Plus className="size-4" />
              </Button>
            ) : (
              <Button variant="primary" size="md" className="w-full">
                <Plus className="size-4" />
                Create
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <CheckSquare className="size-4" />
              Task
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FolderKanban className="size-4" />
              Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="size-4" />
              Document
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Target className="size-4" />
              Goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Primary navigation */}
      <SidebarSection collapsed={railCollapsed}>
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavigationItem
              key={item.id}
              asChild
              active={currentId === item.id}
              collapsed={railCollapsed}
              title={item.label}
            >
              <Link href={item.href} onClick={() => setDrawerOpen(false)}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {!railCollapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.count ? (
                      <Badge variant="chrome" size="sm" className="tabular">
                        {item.count > 99 ? "99+" : item.count}
                      </Badge>
                    ) : null}
                  </>
                )}
              </Link>
            </NavigationItem>
          );
        })}
      </SidebarSection>

      {/* Spaces — scrolls independently so a workspace with forty spaces
          never pushes the account block off the bottom of the rail. */}
      <div className="tq-scroll-none -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        <SpaceTree
          collapsed={railCollapsed}
          activeSpace={activeSpaceSlug}
          activeProject={activeProjectSlug}
          onNavigate={() => setDrawerOpen(false)}
          onCreateSpace={() => router.push("/spaces?new=1")}
        />
      </div>

      <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-sidebar-border pt-2.5">
        {!railCollapsed && <UpgradeCard />}
        {railCollapsed && (
          <IconButton
            label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="mx-auto text-sidebar-text-muted hover:text-sidebar-text"
          >
            <PanelLeftOpen className="size-4" />
          </IconButton>
        )}
        <UserArea user={currentUser} collapsed={railCollapsed} />
      </div>
    </Sidebar>
  );

  return (
    <div className="tq-aurora flex h-screen overflow-hidden bg-background">
      {/* Desktop rail */}
      {!isMobile && rail}

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#05030D]/70 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left-2 duration-base">{rail}</div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar className="sticky top-0 z-30">
          {isMobile && (
            <IconButton label="Open navigation" onClick={() => setDrawerOpen(true)} className="-ml-1">
              <Menu className="size-5" />
            </IconButton>
          )}
          {isMobile && <Wordmark size={22} className="md:hidden" markOnly />}

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="w-full max-w-lg">
              <CommandBar />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* On mobile the palette collapses to its icon — the field
                would leave no room for the workspace switcher. */}
            <IconButton label="Search" className="md:hidden">
              <Search className="size-[18px]" />
            </IconButton>

            <WorkspaceSwitcher />

            <NotificationCenter />
            <IconButton label="Help and support" className="hidden sm:inline-flex">
              <HelpCircle className="size-[18px]" />
            </IconButton>
          </div>
        </TopBar>

        {header}

        {/* pb-20 on mobile keeps the last row clear of the tab bar. */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile tab bar — the four primary destinations plus the drawer. */}
      <nav
        aria-label="Primary mobile"
        className="tq-glass fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map((item) => {
          const Icon = item.icon;
          const active = currentId === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium
                          transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus
                          ${active ? "text-primary" : "text-text-muted"}`}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {item.count ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular text-white">
                    {item.count > 9 ? "9+" : item.count}
                  </span>
                ) : null}
              </span>
              {item.label}
              {active && (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-muted
                     transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}
