"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, Sparkles, UserRound } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flow/ui";
import { signOut } from "@/lib/auth/actions";
import type { ShellUser } from "./nav-model";

/**
 * The account block that anchors the bottom of the rail — identity plus
 * the menu that owns every account-scoped destination. It lives at the
 * bottom because it is the least-used control in the shell; the rail's
 * top edge is reserved for the actions people take constantly.
 */
export function UserArea({ user, collapsed }: { user: ShellUser; collapsed?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-fast
                      hover:bg-sidebar-hover focus-visible:outline-none focus-visible:shadow-focus
                      ${collapsed ? "justify-center" : ""}`}
          aria-label="Account menu"
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium text-sidebar-text">{user.name}</span>
                <span className="block truncate text-caption text-sidebar-text-muted">{user.role}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-text-muted" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-body-sm font-medium text-text-primary">{user.name}</p>
          <p className="truncate text-caption text-text-muted">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <UserRound className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Sparkles className="size-4" />
          Upgrade to Pro
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* A form, not an onClick: sign-out clears an httpOnly cookie,
            which only the server can do. */}
        <form action={signOut}>
          <DropdownMenuItem asChild destructive>
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
