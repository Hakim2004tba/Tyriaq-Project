"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  ChevronLeft,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Layers,
  Users,
  X,
} from "lucide-react";
import { Avatar, IconButton, Input } from "@flow/ui";
import { cn } from "@flow/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/plans", label: "Plans", icon: Layers },
  { href: "/admin/analytics", label: "Usage & analytics", icon: BarChart3 },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/audit", label: "Audit log", icon: Activity },
  { href: "/admin/system", label: "System", icon: Server },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/**
 * The back-office shell.
 *
 * Deliberately its own layout rather than the customer one. They are
 * different products with different stakes: this is where somebody
 * suspends an account or edits a price, and it should never be possible
 * to mistake which of the two you are looking at. Same tokens, same
 * typography — a distinctly cooler, denser arrangement of them.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="tq-aurora flex min-h-screen bg-background">
      {/* ------------------------------ sidebar ----------------------------- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-border bg-surface-muted/70 backdrop-blur-xl",
          "transition-transform duration-slow lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-2 rounded focus-visible:outline-none focus-visible:shadow-focus">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand text-caption font-bold text-white">
              T
            </span>
            <span className="truncate text-body font-semibold text-text-primary">tyriaq</span>
            <span className="shrink-0 rounded-md bg-primary-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Admin
            </span>
          </Link>
          <IconButton
            label="Close menu"
            size="sm"
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </IconButton>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2" aria-label="Admin">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm transition-colors duration-fast",
                      "focus-visible:outline-none focus-visible:shadow-focus",
                      active
                        ? "bg-primary-muted text-text-primary shadow-[inset_0_0_0_1px_rgb(var(--color-primary)/0.25)]"
                        : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-text-muted")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* The person holding these powers, and the way out. */}
        <div className="border-t border-border p-2.5">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name="Hakim Aissa" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm text-text-primary">Hakim Aissa</span>
              <span className="flex items-center gap-1 text-caption text-text-muted">
                <ShieldCheck className="size-3 shrink-0 text-primary" aria-hidden="true" />
                Platform administrator
              </span>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-text-secondary
                       transition-colors hover:bg-white/[0.04] hover:text-text-primary
                       focus-visible:outline-none focus-visible:shadow-focus"
          >
            <ChevronLeft className="size-4 shrink-0 text-text-muted" />
            Back to Tyriaq
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-text-secondary
                       transition-colors hover:bg-danger-subtle hover:text-danger
                       focus-visible:outline-none focus-visible:shadow-focus"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </Link>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* ------------------------------- main ------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-[18px]" />
          </IconButton>

          <div className="relative min-w-0 max-w-lg flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              placeholder="Search a user, a workspace…"
              aria-label="Search the platform"
              className="h-9 pl-8"
            />
          </div>

          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-caption text-text-secondary sm:flex">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            All systems operational
          </span>

          <Avatar name="Hakim Aissa" size="sm" />
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
