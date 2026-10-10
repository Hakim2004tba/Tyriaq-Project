import Link from "next/link";
import { FileText, FileOutput } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getClientByEmail } from "@/lib/data/clients";
import { getDevisForClient, isDevisAwaitingClient } from "@/lib/data/devis";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ClientDevisActions } from "@/components/dashboard/mes-devis/client-devis-actions";
import type { DevisStatus } from "@/lib/data/operations";

const STATUS_VARIANT: Record<DevisStatus, "neutral" | "info" | "warning" | "success" | "danger" | "gold"> = {
  Brouillon: "neutral",
  Envoyé: "info",
  Vu: "warning",
  Accepté: "success",
  Refusé: "danger",
  "Modification demandée": "gold",
};

export default async function MesDevisPage() {
  const user = await requirePermission("devis.view_own");
  const client = await getClientByEmail(user.email);

  if (!client) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <FileText className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial pour lier votre espace.
        </p>
      </div>
    );
  }

  const devis = await getDevisForClient(client.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Mes devis</h1>
        <p className="mt-1 text-sm text-text-muted">
          Consultez et répondez aux devis envoyés par votre commercial.
        </p>
      </div>

      {devis.length === 0 && (
        <Card className="p-10 text-center text-sm text-text-muted">Aucun devis pour le moment.</Card>
      )}

      <div className="flex flex-col gap-4">
        {devis.map((d) => (
          <Card key={d.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{d.ref}</CardTitle>
                  <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                </div>
                <CardDescription className="mt-1">{d.projectLabel}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Montant</p>
                <p className="text-lg font-medium text-text-primary">{formatCurrencyDA(d.amount)}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
                <span>Reçu le {formatShortDate(d.createdAt)} · Valide jusqu&rsquo;au {formatShortDate(d.validUntil)}</span>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={`/devis-pdf/${d.id}`} target="_blank" rel="noopener noreferrer">
                    <FileOutput className="h-3.5 w-3.5" /> Voir le document
                  </Link>
                </Button>
              </div>

              {d.clientNote && (
                <p className="rounded-md border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-text-secondary">
                  {d.status === "Refusé" ? "Votre motif de refus : " : "Votre demande : "}
                  {d.clientNote}
                </p>
              )}

              {isDevisAwaitingClient(d.status) && <ClientDevisActions devisId={d.id} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
