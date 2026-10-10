import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getClientByEmail } from "@/lib/data/clients";
import { getDevisById } from "@/lib/data/devis";
import { getConfigByDevisId } from "@/lib/data/kitchen-config";
import { getLineItemsForDevis, computeDevisTotalsFor } from "@/lib/data/pricing";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { PrintActions } from "@/components/dashboard/devis/print-actions";

export async function generateMetadata({ params }: PageProps<"/devis-pdf/[id]">): Promise<Metadata> {
  const { id } = await params;
  const devis = await getDevisById(id);
  return { title: devis ? `Devis ${devis.ref} — ART Cuisine` : "Devis — ART Cuisine" };
}

export default async function DevisDocumentPage({ params }: PageProps<"/devis-pdf/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const devis = await getDevisById(id);
  if (!devis) notFound();

  const role = user.role as Role;
  if (hasPermission(role, "devis.manage")) {
    const scope = getOwnerScope(user);
    if (scope && devis.commercial !== null && devis.commercial !== scope) notFound();
  } else if (hasPermission(role, "devis.view_own")) {
    const client = await getClientByEmail(user.email);
    if (!client || devis.clientId !== client.id) notFound();
  } else {
    redirect("/dashboard");
  }

  const client = devis.clientId ? await getClientById(devis.clientId) : undefined;
  const config = await getConfigByDevisId(devis.id);
  const contactPhone = client?.phone ?? config?.contactPhone ?? "—";
  const contactEmail = client?.email ?? config?.contactEmail ?? "—";
  const contactAddress = client?.address ?? null;

  const lineItems = await getLineItemsForDevis(devis.id);
  const totals = computeDevisTotalsFor(devis, lineItems);

  const SPEC_ROWS: [string, string][] = config
    ? [
        ["Agencement", `Cuisine ${config.layout}`],
        ["Îlot", config.island],
        ["Profondeur", config.depth],
        ["Hotte", config.hood],
        ["Four", config.oven],
        ["Réfrigérateur", config.fridge],
        ["Sol", config.floor],
        ["Dimensions", config.dimensions],
      ]
    : [];

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
            <p className="font-display text-xl font-medium text-ink-950">Devis {devis.ref}</p>
            <p className="mt-1 text-xs text-stone-500">Version {devis.version}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Destinataire</p>
            <p className="mt-1.5 font-medium text-ink-950">{devis.clientName}</p>
            <p className="text-stone-600">{contactPhone}</p>
            <p className="text-stone-600">{contactEmail}</p>
            {contactAddress && <p className="text-stone-600">{contactAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Dates</p>
            <p className="mt-1.5 text-stone-600">Émis le {formatShortDate(devis.createdAt)}</p>
            <p className="text-stone-600">Valide jusqu&rsquo;au {formatShortDate(devis.validUntil)}</p>
            <p className="mt-1.5 text-stone-600">Statut : {devis.status}</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Projet</p>
          <p className="mt-1.5 text-base font-medium text-ink-950">{devis.projectLabel}</p>
        </div>

        {lineItems.length > 0 ? (
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wider text-stone-400">
                <th className="py-2 font-medium">Désignation</th>
                <th className="py-2 text-right font-medium">Qté</th>
                <th className="py-2 text-right font-medium">Prix unitaire</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((line) => (
                <tr key={line.id} className="border-b border-stone-200">
                  <td className="py-2 pr-4 text-stone-700">{line.label}</td>
                  <td className="py-2 text-right text-stone-600">{line.quantity} {line.unit}</td>
                  <td className="py-2 text-right text-stone-600">{formatCurrencyDA(line.unitPrice)}</td>
                  <td className="py-2 text-right font-medium text-ink-950">{formatCurrencyDA(line.quantity * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          SPEC_ROWS.length > 0 && (
            <table className="mt-6 w-full border-collapse text-sm">
              <tbody>
                {SPEC_ROWS.map(([label, value]) => (
                  <tr key={label} className="border-b border-stone-200">
                    <td className="py-2 pr-4 text-stone-500">{label}</td>
                    <td className="py-2 text-right font-medium text-ink-950">{value}</td>
                  </tr>
                ))}
                {config && config.accessories.length > 0 && (
                  <tr className="border-b border-stone-200">
                    <td className="py-2 pr-4 align-top text-stone-500">Accessoires</td>
                    <td className="py-2 text-right font-medium text-ink-950">{config.accessories.join(", ")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        )}

        <div className="mt-8 flex justify-end border-t border-stone-200 pt-6">
          <div className="flex w-64 flex-col gap-1.5 text-sm">
            {lineItems.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Sous-total</span><span>{formatCurrencyDA(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Remise{devis.discountType === "Pourcentage" ? ` (${devis.discountValue}%)` : ""}</span>
                    <span>− {formatCurrencyDA(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-stone-600">
                  <span>TVA ({devis.taxRate}%)</span><span>{formatCurrencyDA(totals.taxAmount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-stone-300 pt-1.5 text-base font-medium text-ink-950">
                  <span>Total</span><span>{formatCurrencyDA(totals.total)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-stone-600">
                  <span>Acompte à la commande ({devis.depositPercent}%)</span><span>{formatCurrencyDA(totals.depositAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Solde restant</span><span>{formatCurrencyDA(totals.remainingBalance)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Total</span>
                <span className="text-lg font-medium text-ink-950">{formatCurrencyDA(devis.amount)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-500">
          <p>Devis établi à titre indicatif, valable jusqu&rsquo;à la date indiquée ci-dessus. Étude, conception et fabrication 100% en atelier.</p>
          <p className="mt-1">ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00</p>
        </div>
      </div>
    </div>
  );
}
