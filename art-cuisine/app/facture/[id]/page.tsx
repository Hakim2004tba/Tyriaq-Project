import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getClientByEmail } from "@/lib/data/clients";
import { getProjectById } from "@/lib/data/project-records";
import { getProjectFinancials } from "@/lib/data/finance";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { PrintActions } from "@/components/dashboard/devis/print-actions";

export async function generateMetadata({ params }: PageProps<"/facture/[id]">): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  return { title: project ? `Facture ${project.ref} — ART Cuisine` : "Facture — ART Cuisine" };
}

export default async function ProjectInvoicePage({ params }: PageProps<"/facture/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const project = getProjectById(id);
  if (!project) notFound();

  const role = user.role as Role;
  if (hasPermission(role, "finance.manage")) {
    const scope = getOwnerScope(user);
    if (scope && project.commercial !== null && project.commercial !== scope) notFound();
  } else if (hasPermission(role, "projects.view_own")) {
    const client = await getClientByEmail(user.email);
    if (!client || project.clientId !== client.id) notFound();
  } else {
    redirect("/dashboard");
  }

  const client = project.clientId ? await getClientById(project.clientId) : undefined;
  const financials = await getProjectFinancials(project);
  const paidPayments = financials.payments.filter((p) => p.status === "Payé");
  const scheduledPayments = financials.payments.filter((p) => p.status !== "Payé");

  return (
    <div className="min-h-screen bg-surface-sunken py-10 print:bg-white print:py-0">
      <PrintActions />

      <div className="mx-auto max-w-3xl rounded-lg border border-border-subtle bg-white p-10 shadow-elevation-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between border-b border-border-subtle pb-6">
          <div>
            <p className="font-display text-2xl font-medium text-ink-950">ART CUISINE</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">Cuisines sur mesure</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-medium text-ink-950">Facture — {project.ref}</p>
            <p className="mt-1 text-xs text-stone-500">Émise le {formatShortDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Client</p>
            <p className="mt-1.5 font-medium text-ink-950">{project.clientName}</p>
            {client?.phone && <p className="text-stone-600">{client.phone}</p>}
            {client?.email && <p className="text-stone-600">{client.email}</p>}
            {client?.address && <p className="text-stone-600">{client.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Projet</p>
            <p className="mt-1.5 text-stone-600">{project.name}</p>
            <p className="text-stone-600">Démarré le {formatShortDate(project.startDate)}</p>
            <p className="mt-1.5 text-stone-600">Statut financier : {financials.status}</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-stone-200 pt-6">
          <div className="flex w-72 flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between text-stone-600">
              <span>Total projet</span><span className="font-medium text-ink-950">{formatCurrencyDA(financials.total)}</span>
            </div>
            <div className="flex items-center justify-between text-stone-600">
              <span>Acompte prévu</span><span>{formatCurrencyDA(financials.depositAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-stone-600">
              <span>Total encaissé</span><span>{formatCurrencyDA(financials.paid)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-stone-300 pt-1.5 text-base font-medium text-ink-950">
              <span>Solde restant</span><span>{formatCurrencyDA(financials.remaining)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Historique des paiements</p>
          {paidPayments.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Aucun paiement reçu à ce jour.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wider text-stone-400">
                  <th className="py-2 font-medium">Libellé</th>
                  <th className="py-2 font-medium">Méthode</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {paidPayments.map((p) => (
                  <tr key={p.id} className="border-b border-stone-200">
                    <td className="py-2 pr-4 text-stone-700">{p.label}</td>
                    <td className="py-2 text-stone-600">{p.method}</td>
                    <td className="py-2 text-stone-600">{formatShortDate(p.date)}</td>
                    <td className="py-2 text-right font-medium text-ink-950">{formatCurrencyDA(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {scheduledPayments.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Échéancier restant</p>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wider text-stone-400">
                  <th className="py-2 font-medium">Libellé</th>
                  <th className="py-2 font-medium">Échéance</th>
                  <th className="py-2 font-medium">Statut</th>
                  <th className="py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPayments.map((p) => (
                  <tr key={p.id} className="border-b border-stone-200">
                    <td className="py-2 pr-4 text-stone-700">{p.label}</td>
                    <td className="py-2 text-stone-600">{formatShortDate(p.date)}</td>
                    <td className="py-2 text-stone-600">{p.status}</td>
                    <td className="py-2 text-right font-medium text-ink-950">{formatCurrencyDA(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-500">
          <p>Document récapitulatif à titre informatif — ne constitue pas une facture fiscale.</p>
          <p className="mt-1">ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00</p>
        </div>
      </div>
    </div>
  );
}
