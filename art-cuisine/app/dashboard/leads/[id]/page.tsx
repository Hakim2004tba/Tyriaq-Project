import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserRound,
  Layers,
  Wallet,
  Pencil,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getLeadById, getLeadInteractions, getUpcomingItems } from "@/lib/data/leads";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeadFormDialog } from "@/components/dashboard/leads/lead-form-dialog";
import { LeadStatusSelect } from "@/components/dashboard/leads/lead-status-select";
import { ConvertLeadButton } from "@/components/dashboard/leads/convert-lead-button";
import { LeadInteractionsPanel } from "@/components/dashboard/leads/lead-interactions-panel";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  const lead = await getLeadById(id);
  return { title: lead ? `${lead.name} — ART Cuisine` : "Lead — ART Cuisine" };
}

export default async function LeadDetailPage({ params }: PageProps<"/dashboard/leads/[id]">) {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const lead = await getLeadById(id);
  if (!lead) notFound();
  if (scope && lead.commercial !== scope) notFound();

  const [interactions, upcoming] = await Promise.all([
    getLeadInteractions(lead.id),
    getUpcomingItems(lead.id),
  ]);
  const isClosed = lead.status === "Gagné" || lead.status === "Perdu";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/leads"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux leads
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
                {lead.name}
              </h1>
              <Badge variant="outline">{lead.source}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Lead créé le {formatShortDate(lead.createdAt)}
            </p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Phone className="h-4 w-4 shrink-0 text-text-muted" /> {lead.phone}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Mail className="h-4 w-4 shrink-0 text-text-muted" /> {lead.email}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <MapPin className="h-4 w-4 shrink-0 text-text-muted" /> {lead.city}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> Commercial : {lead.commercial}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Layers className="h-4 w-4 shrink-0 text-text-muted" /> {lead.projectType}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Wallet className="h-4 w-4 shrink-0 text-text-muted" /> Budget : {formatCurrencyDA(lead.budget)}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
            {!isClosed && <ConvertLeadButton leadId={lead.id} leadName={lead.name} />}
            <LeadFormDialog
              lead={lead}
              lockedCommercial={scope ?? undefined}
              trigger={
                <Button variant="outline">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              }
            />
          </div>
        </div>
      </Card>

      <LeadInteractionsPanel leadId={lead.id} interactions={interactions} upcoming={upcoming} />
    </div>
  );
}
