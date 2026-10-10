import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/roles";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getClientByEmail } from "@/lib/data/clients";
import { getPaymentById } from "@/lib/data/finance";
import { getProjectById } from "@/lib/data/project-records";
import { getDevisById } from "@/lib/data/devis";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { PrintActions } from "@/components/dashboard/devis/print-actions";

export async function generateMetadata({ params }: PageProps<"/recu-paiement/[id]">): Promise<Metadata> {
  const { id } = await params;
  const payment = getPaymentById(id);
  return { title: payment ? `Reçu ${payment.id} — ART Cuisine` : "Reçu — ART Cuisine" };
}

export default async function PaymentReceiptPage({ params }: PageProps<"/recu-paiement/[id]">) {
  const user = await requireSession();
  const { id } = await params;

  const payment = getPaymentById(id);
  if (!payment) notFound();
  if (payment.status !== "Payé") notFound();

  const role = user.role as Role;
  if (hasPermission(role, "finance.manage")) {
    const scope = getOwnerScope(user);
    if (scope) {
      const project = payment.projectId ? getProjectById(payment.projectId) : undefined;
      const devis = payment.devisId ? await getDevisById(payment.devisId) : undefined;
      const commercial = project?.commercial ?? devis?.commercial ?? null;
      if (commercial !== null && commercial !== scope) notFound();
    }
  } else if (hasPermission(role, "devis.view_own") || hasPermission(role, "projects.view_own")) {
    const client = await getClientByEmail(user.email);
    if (!client || payment.clientId !== client.id) notFound();
  } else {
    redirect("/dashboard");
  }

  const client = payment.clientId ? await getClientById(payment.clientId) : undefined;
  const project = payment.projectId ? getProjectById(payment.projectId) : undefined;
  const devis = payment.devisId ? await getDevisById(payment.devisId) : undefined;

  return (
    <div className="min-h-screen bg-surface-sunken py-10 print:bg-white print:py-0">
      <PrintActions />

      <div className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-white p-10 shadow-elevation-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex items-start justify-between border-b border-border-subtle pb-6">
          <div>
            <p className="font-display text-2xl font-medium text-ink-950">ART CUISINE</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-stone-500">Cuisines sur mesure</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-medium text-ink-950">Reçu {payment.id}</p>
            <p className="mt-1 text-xs text-stone-500">Émis le {formatShortDate(payment.date)}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Reçu de</p>
            <p className="mt-1.5 font-medium text-ink-950">{payment.clientName}</p>
            {client?.phone && <p className="text-stone-600">{client.phone}</p>}
            {client?.email && <p className="text-stone-600">{client.email}</p>}
            {client?.address && <p className="text-stone-600">{client.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Référence</p>
            {project && <p className="mt-1.5 text-stone-600">Projet {project.ref} — {project.name}</p>}
            {devis && <p className="text-stone-600">Devis {devis.ref}</p>}
            <p className="mt-1.5 text-stone-600">Méthode : {payment.method}</p>
            <p className="text-stone-600">Enregistré par {payment.recordedBy}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-y border-stone-200 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{payment.label}</p>
          <p className="font-display text-3xl font-medium text-ink-950">{formatCurrencyDA(payment.amount)}</p>
          <p className="text-sm text-stone-500">reçu le {formatShortDate(payment.date)}</p>
        </div>

        {payment.notes && (
          <div className="mt-6 text-sm text-stone-600">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Notes</p>
            <p className="mt-1.5">{payment.notes}</p>
          </div>
        )}

        <div className="mt-10 border-t border-stone-200 pt-6 text-xs leading-relaxed text-stone-500">
          <p>Ce reçu confirme la réception du paiement indiqué ci-dessus. Conservez-le pour vos dossiers.</p>
          <p className="mt-1">ART Cuisine — contact@art-cuisine.dz — +213 5 55 00 00 00</p>
        </div>
      </div>
    </div>
  );
}
