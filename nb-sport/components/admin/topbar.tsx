"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Bell, LogOut, Search } from "lucide-react";

const TITLES: Record<string, string> = {
  "/admin": "Tableau de bord",
  "/admin/commandes": "Commandes",
  "/admin/produits": "Produits",
  "/admin/categories": "Catégories",
  "/admin/clients": "Clients",
  "/admin/livraisons": "Livraisons",
  "/admin/promotions": "Promotions",
  "/admin/medias": "Images / Médias",
  "/admin/statistiques": "Statistiques",
  "/admin/parametres": "Paramètres",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([key]) => pathname.startsWith(key) && key !== "/admin")?.[1] ??
    "Administration";

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6">
      <h1 className="text-lg font-bold">{title}</h1>
      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          placeholder="Rechercher..."
          className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-accent-strong"
        />
      </div>
      <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
      </button>
      <ThemeToggle />
      <button
        onClick={handleLogout}
        aria-label="Se déconnecter"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full nb-gradient-accent text-xs font-bold text-accent-foreground">
        NB
      </div>
    </header>
  );
}
