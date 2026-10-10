import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatCurrencyDA, formatShortDate, formatRelativeTime } from "@/lib/format";
import { isFollowUpOverdue } from "@/lib/data/leads";
import type { LeadRecord, LeadStatus } from "@/lib/data/operations";

const STATUS_VARIANT: Record<LeadStatus, "neutral" | "info" | "outline" | "gold" | "warning" | "success" | "danger"> = {
  Nouveau: "neutral",
  Contacté: "info",
  Qualification: "outline",
  "Rendez-vous": "gold",
  Devis: "warning",
  Négociation: "info",
  Gagné: "success",
  Perdu: "danger",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function LeadListView({ leads }: { leads: LeadRecord[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
      <Table className="border-none">
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type de projet</TableHead>
            <TableHead>Commercial</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead>Relance</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-sm text-text-muted">
                Aucun lead ne correspond à ces critères.
              </TableCell>
            </TableRow>
          )}
          {leads.map((lead) => {
            const overdue = isFollowUpOverdue(lead.nextFollowUpAt);
            return (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="focus-ring flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[0.625rem]">{initials(lead.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-text-primary hover:text-text-accent">{lead.name}</p>
                      <p className="text-xs text-text-muted">{lead.city}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell><Badge variant="outline">{lead.source}</Badge></TableCell>
                <TableCell className="text-text-secondary">{lead.projectType}</TableCell>
                <TableCell className="text-text-secondary">{lead.commercial}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[lead.status]}>{lead.status}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatCurrencyDA(lead.budget)}</TableCell>
                <TableCell>
                  {lead.nextFollowUpAt ? (
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        overdue ? "font-medium text-[var(--status-danger-fg)]" : "text-text-muted",
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" /> {formatRelativeTime(lead.nextFollowUpAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="text-text-secondary">{formatShortDate(lead.createdAt)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { LeadListView };
