import Link from "next/link";
import { Wallet, FileOutput } from "lucide-react";
import { requireClientRecord } from "@/lib/auth/session";
import { getPaymentsForClient, PAYMENT_STATUS_BADGE, getPaymentDisplayStatus } from "@/lib/data/finance";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

export default async function MesPaiementsPage() {
  const { client } = await requireClientRecord("payments.view_own");

  if (!client) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-16 text-center">
        <Wallet className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial.
        </p>
      </div>
    );
  }

  const payments = getPaymentsForClient(client.id);
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const paid = payments.filter((p) => getPaymentDisplayStatus(p) === "Payé").reduce((sum, p) => sum + p.amount, 0);
  const overdue = payments.filter((p) => getPaymentDisplayStatus(p) === "En retard").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">Mes paiements</h1>
        <p className="mt-1 text-sm text-text-muted">L&rsquo;historique de vos paiements et de vos reçus.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total réglé" value={formatCurrencyDA(paid)} icon={Wallet} helperText={`sur ${formatCurrencyDA(total)}`} />
        <StatCard label="En retard" value={formatCurrencyDA(overdue)} icon={Wallet} helperText={overdue > 0 ? "à régulariser" : "aucun retard"} />
        <StatCard label="Paiements" value={String(payments.length)} icon={Wallet} helperText="enregistrés" />
      </div>

      {payments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-muted">Aucun paiement pour le moment.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {payments.map((payment) => {
            const status = getPaymentDisplayStatus(payment);
            return (
              <Card key={payment.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{payment.label}</CardTitle>
                      <Badge variant={PAYMENT_STATUS_BADGE[status]}>{status}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {payment.projectRef ?? payment.devisId} · {payment.method}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Montant</p>
                    <p className="text-lg font-medium text-text-primary">{formatCurrencyDA(payment.amount)}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
                  <span>{status === "Payé" ? "Payé le" : "Attendu le"} {formatShortDate(payment.date)}</span>
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <Link href={`/recu-paiement/${payment.id}`} target="_blank" rel="noopener noreferrer">
                      <FileOutput className="h-3.5 w-3.5" /> Voir le reçu
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
