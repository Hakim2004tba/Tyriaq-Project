"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardSidebarMobile } from "@/components/layout/dashboard-sidebar";
import { postJson } from "@/lib/api-client";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatRelativeTime } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import type { UserNotificationRecord } from "@/lib/data/operations";

function NotificationsMenu({ notifications }: { notifications: UserNotificationRecord[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpenNotification(n: UserNotificationRecord) {
    if (!n.read) {
      await markNotificationRead(n.id);
      router.refresh();
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAll() {
    setPending(true);
    const result = await markAllNotificationsRead();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-stone-100 hover:text-text-primary"
        >
          <Bell className="h-[1.05rem] w-[1.05rem]" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-strong ring-2 ring-surface-raised" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">Notifications</span>
          {unreadCount > 0 ? (
            <Badge variant="gold">{unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}</Badge>
          ) : (
            <Badge variant="neutral">À jour</Badge>
          )}
        </div>
        <DropdownMenuSeparator className="mx-0" />
        {notifications.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Aucune notification.</p>
        )}
        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            onSelect={() => handleOpenNotification(n)}
            className="flex flex-col items-start gap-0.5 px-4 py-3"
          >
            <span className="flex w-full items-center gap-2">
              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-strong" />}
              <span className="truncate text-sm font-medium text-text-primary">{n.title}</span>
            </span>
            <span className="text-xs text-text-muted">{n.description}</span>
            <span className="text-[0.6875rem] text-stone-400">{formatRelativeTime(n.createdAt)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="mx-0" />
        {unreadCount > 0 && (
          <DropdownMenuItem disabled={pending} onSelect={handleMarkAll} className="justify-center px-4 py-2.5 text-sm font-medium text-text-secondary">
            {pending ? "…" : "Tout marquer comme lu"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="justify-center px-4 py-2.5 text-sm font-medium text-accent-strong">
          <Link href="/dashboard/notifications">Voir toutes les notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await postJson("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-ring flex items-center gap-2.5 rounded-md py-1.5 pl-1.5 pr-2 transition-colors hover:bg-stone-100"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-[9rem] truncate text-sm font-medium text-text-primary">
              {user.name}
            </span>
            <span className="block text-xs text-text-muted">
              {ROLE_LABELS[user.role as Role]}
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-text-muted sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <UserRound className="h-4 w-4" /> Profil &amp; sécurité
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={loggingOut} onSelect={handleLogout}>
          <LogOut className="h-4 w-4" /> {loggingOut ? "Déconnexion…" : "Déconnexion"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DashboardTopbar({ user, title, notifications }: { user: SessionUser; title?: string; notifications: UserNotificationRecord[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border-subtle bg-surface/90 px-5 backdrop-blur-md lg:px-8">
      <DashboardSidebarMobile role={user.role as Role} />

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Input
          icon={<Search />}
          placeholder="Rechercher un client, un projet, un devis…"
          className="bg-surface-sunken"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-default bg-surface-raised px-1.5 py-0.5 text-[0.625rem] font-medium text-text-muted">
          ⌘K
        </kbd>
      </div>

      {title && (
        <h1 className="flex-1 truncate font-display text-lg text-text-primary sm:hidden">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationsMenu notifications={notifications} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

export { DashboardTopbar };
