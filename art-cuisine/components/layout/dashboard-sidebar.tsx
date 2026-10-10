"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FolderKanban,
  Factory,
  Paintbrush,
  Palette,
  Wrench,
  Headset,
  UserSquare2,
  Image as ImageIcon,
  Layers,
  BarChart3,
  Settings,
  Menu,
  CalendarDays,
  CalendarCheck,
  ListChecks,
  Receipt,
  Files,
  Wallet,
  MessageSquare,
  Bell,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

const STAFF_NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Clients", href: "/dashboard/clients", icon: Users, permission: "clients.manage" },
  { label: "Leads", href: "/dashboard/leads", icon: Target, permission: "leads.manage" },
  { label: "Devis", href: "/dashboard/devis", icon: FileText, permission: "devis.manage" },
  { label: "Catalogue tarifs", href: "/dashboard/catalogue", icon: Receipt, permission: "catalogue.manage" },
  { label: "Documents", href: "/dashboard/documents", icon: Files, permission: "documents.manage" },
  { label: "Rendez-vous", href: "/dashboard/rendez-vous", icon: CalendarCheck, permission: "leads.manage" },
  { label: "Mon suivi", href: "/dashboard/suivi", icon: ListChecks, permission: "leads.manage" },
  { label: "Calendrier", href: "/dashboard/calendrier", icon: CalendarDays, permission: "leads.manage" },
  { label: "Projets", href: "/dashboard/projets", icon: FolderKanban, permission: "projects.view" },
  { label: "Conception", href: "/dashboard/conception", icon: Palette, permission: "conception.manage" },
  { label: "Production", href: "/dashboard/production", icon: Factory, permission: "production.manage" },
  { label: "Vernissage", href: "/dashboard/vernissage", icon: Paintbrush, permission: "vernissage.manage" },
  { label: "Montage", href: "/dashboard/montage", icon: Wrench, permission: "montage.manage" },
  { label: "SAV", href: "/dashboard/sav", icon: Headset, permission: "sav.manage" },
  { label: "Finances", href: "/dashboard/finance", icon: Wallet, permission: "finance.manage" },
  { label: "Équipe", href: "/dashboard/equipe", icon: UserSquare2, permission: "equipe.manage" },
  { label: "Portefeuille", href: "/dashboard/portefeuille", icon: ImageIcon, permission: "portefeuille.view" },
  { label: "Matériaux & Finitions", href: "/dashboard/materiaux", icon: Layers, permission: "materiaux.manage" },
  { label: "Messagerie", href: "/dashboard/messagerie", icon: MessageSquare, permission: "dashboard.view" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, permission: "dashboard.view" },
  { label: "Rapports", href: "/dashboard/rapports", icon: BarChart3, permission: "rapports.view" },
  { label: "Paramètres", href: "/dashboard/parametres", icon: Settings, permission: "parametres.manage" },
];

const CLIENT_NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Mes projets", href: "/dashboard/mes-projets", icon: FolderKanban, permission: "projects.view_own" },
  { label: "Mes devis", href: "/dashboard/mes-devis", icon: FileText, permission: "devis.view_own" },
  { label: "Mes paiements", href: "/dashboard/mes-paiements", icon: CreditCard, permission: "payments.view_own" },
  { label: "Mes documents", href: "/dashboard/mes-documents", icon: Files, permission: "documents.view_own" },
  { label: "Mes messages", href: "/dashboard/mes-messages", icon: MessageSquare, permission: "dashboard.view" },
  { label: "SAV & Garantie", href: "/dashboard/sav", icon: Headset, permission: "sav.view_own" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, permission: "dashboard.view" },
];

function navItemsForRole(role: Role): NavItem[] {
  const source = role === "client" ? CLIENT_NAV_ITEMS : STAFF_NAV_ITEMS;
  return source.filter((item) => hasPermission(role, item.permission));
}

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "focus-ring group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-stone-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-gold-400" : "text-stone-500 group-hover:text-gold-400",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DashboardSidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950 lg:flex">
      <div className="flex items-center px-6 py-7">
        <Logo inverse />
      </div>
      <SidebarNav role={role} />
      <div className="border-t border-white/5 px-6 py-6">
        <p className="font-display text-sm italic leading-snug text-stone-400">
          L&rsquo;excellence dans chaque détail.
        </p>
      </div>
    </aside>
  );
}

function DashboardSidebarMobile({ role }: { role: Role }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir la navigation"
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-text-primary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-64 max-w-[80vw] flex-col border-white/5 bg-ink-950 p-0"
      >
        <div className="flex items-center px-6 py-7">
          <Logo inverse />
        </div>
        <SidebarNav role={role} />
      </SheetContent>
    </Sheet>
  );
}

export { DashboardSidebar, DashboardSidebarMobile };
