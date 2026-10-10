import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getMyInteractions } from "@/lib/data/personal";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SuiviItem } from "@/components/dashboard/suivi/suivi-item";
import type { LeadInteractionType } from "@/lib/data/operations";

const TYPE_FILTERS: { value: LeadInteractionType | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "note", label: "Notes" },
  { value: "call", label: "Appels" },
  { value: "appointment", label: "Rendez-vous" },
  { value: "task", label: "Tâches" },
  { value: "reminder", label: "Rappels" },
];

export default async function SuiviPage({ searchParams }: PageProps<"/dashboard/suivi">) {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const params = await searchParams;
  const typeParam = typeof params.type === "string" ? params.type : "tous";
  const onlyUpcoming = params.a_venir !== "non";

  const types = typeParam === "tous" ? undefined : [typeParam as LeadInteractionType];
  const [items, allItems] = await Promise.all([
    getMyInteractions(scope, { upcomingOnly: onlyUpcoming, types }),
    getMyInteractions(scope, { upcomingOnly: false }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          {scope ? "Mon suivi" : "Suivi de l'équipe"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Notes, appels, rendez-vous, tâches et rappels liés à {scope ? "vos leads" : "tous les leads"}.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((f) => {
            const href = f.value === "tous" ? "/dashboard/suivi" : `/dashboard/suivi?type=${f.value}`;
            const active = typeParam === f.value;
            return (
              <Link
                key={f.value}
                href={onlyUpcoming ? href : `${href}${href.includes("?") ? "&" : "?"}a_venir=non`}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                  active
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-border-default text-text-secondary hover:border-ink-950 hover:text-text-primary",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <Link
          href={
            onlyUpcoming
              ? `/dashboard/suivi${typeParam !== "tous" ? `?type=${typeParam}&a_venir=non` : "?a_venir=non"}`
              : `/dashboard/suivi${typeParam !== "tous" ? `?type=${typeParam}` : ""}`
          }
          className="text-xs font-medium text-text-accent hover:opacity-70"
        >
          {onlyUpcoming ? `Afficher tout l'historique (${allItems.length})` : "N'afficher que ce qui est à venir"}
        </Link>
      </div>

      <Card className="px-6">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {onlyUpcoming ? "Rien à venir pour ce filtre." : "Aucun élément pour ce filtre."}
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <SuiviItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
