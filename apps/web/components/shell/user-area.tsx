"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, LogOut, Settings, Sparkles, UserRound } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flow/ui";
import { signOut } from "@/lib/auth/actions";
import type { ShellUser } from "./nav-model";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/provider";

/**
 * The account block that anchors the bottom of the rail — identity plus
 * the menu that owns every account-scoped destination. It lives at the
 * bottom because it is the least-used control in the shell; the rail's
 * top edge is reserved for the actions people take constantly.
 */
export function UserArea({ user, collapsed }: { user: ShellUser; collapsed?: boolean }) {
  const { locale, t, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex w-full items-center gap-2.5 rounded-md p-1.5 text-start transition-colors duration-fast
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
            {t("nav.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/people">
            <Settings className="size-4" />
            {t("nav.people")}
          </Link>
        </DropdownMenuItem>
        {/* Was a menu item that did nothing at all when clicked. */}
        <DropdownMenuItem asChild>
          <Link href="/settings/fields">
            <Settings className="size-4" />
            Custom fields
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/billing">
            <Sparkles className="size-4" />
            {t("nav.billing")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/*
          The language, in the language. "العربية" written in Arabic is
          readable to somebody who cannot read the English label around
          it — which is exactly the person who needs this control.
        */}
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={(event) => {
              event.preventDefault();
              if (option !== locale) setLocale(option);
            }}
          >
            <span className="flex size-4 items-center justify-center">
              {option === locale && <Check className="size-3.5" />}
            </span>
            {LOCALE_META[option].native}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/* A form, not an onClick: sign-out clears an httpOnly cookie,
            which only the server can do. */}
        <form action={signOut}>
          <DropdownMenuItem asChild destructive>
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              {t("nav.signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
