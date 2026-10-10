import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  UserRound,
  Phone,
  Mail,
  CalendarClock,
  Pencil,
  FolderKanban,
  ChefHat,
  Target,
  Users,
  FileOutput,
  MessageSquareWarning,
  History as HistoryIcon,
  Receipt,
  Files,
  Upload,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientOptions, getClientById } from "@/lib/data/clients";
import { getLeadOptions, getLeadById } from "@/lib/data/leads";
import { getDevisById, getDevisVersions } from "@/lib/data/devis";
import { getConfigByDevisId } from "@/lib/data/kitchen-config";
import { getProjectOptions, getProjectByRef } from "@/lib/data/appointments";
import { getLineItemsForDevis, getActiveCatalogueByCategory, computeDevisTotalsFor } from "@/lib/data/pricing";
import { getDocumentsForDevis } from "@/lib/data/documents";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DevisFormDialog } from "@/components/dashboard/devis/devis-form-dialog";
import { DevisStatusSelect } from "@/components/dashboard/devis/devis-status-select";
import { KitchenConfigSummary } from "@/components/dashboard/devis/kitchen-config-summary";
import { LinkProjectSelect } from "@/components/dashboard/devis/link-project-select";
import { DuplicateDevisButton } from "@/components/dashboard/devis/duplicate-devis-button";
import { SendEmailButton } from "@/components/dashboard/devis/send-email-button";
import { WhatsAppShareLink } from "@/components/dashboard/devis/whatsapp-share-link";
import { NewVersionDialog } from "@/components/dashboard/devis/new-version-dialog";
import { DevisVersionsTable } from "@/components/dashboard/devis/devis-versions-table";
import { PricingSection } from "@/components/dashboard/devis/pricing-section";
import { UploadDocumentDialog } from "@/components/dashboard/documents/upload-document-dialog";
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";
import { ConvertToProjectButton } from "@/components/dashboard/devis/convert-to-project-button";
import type { DevisStatus } from "@/lib/data/operations";

const STATUS_VARIANT: Record<DevisStatus, "neutral" | "info" | "warning" | "success" | "danger" | "gold"> = {
  Brouillon: "neutral",
  Envoyé: "info",
  Vu: "warning",
  Accepté: "success",
  Refusé: "danger",
  "Modification demandée": "gold",
};

export async function generateMetadata({ params }: PageProps<"/dashboard/devis/[id]">): Promise<Metadata> {
  const { id } = await params;
  const devis = await getDevisById(id);
  return { title: devis ? `${devis.ref} — ART Cuisine` : "Devis — ART Cuisine" };
}

export default async function DevisDetailPage({ params }: PageProps<"/dashboard/devis/[id]">) {
  const user = await requirePermission("devis.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const devis = await getDevisById(id);
  if (!devis) notFound();
  if (scope && devis.commercial !== null && devis.commercial !== scope) notFound();

  const [config, client, lead, versions, lineItems, clientOptions, leadOptions] = await Promise.all([
    getConfigByDevisId(devis.id),
    devis.clientId ? getClientById(devis.clientId) : Promise.resolve(undefined),
    devis.leadId ? getLeadById(devis.leadId) : Promise.resolve(undefined),
    getDevisVersions(devis.id),
    getLineItemsForDevis(devis.id),
    getClientOptions(scope),
    getLeadOptions(scope),
  ]);
  const project = getProjectByRef(devis.projectRef);
  const totals = computeDevisTotalsFor(devis, lineItems);
  const catalogueByCategory = getActiveCatalogueByCategory();
  const documents = getDocumentsForDevis(devis.id);
  const projectOptions = getProjectOptions(scope);

  const contactPhone = client?.phone ?? config?.contactPhone ?? null;
  const contactEmail = client?.email ?? config?.contactEmail ?? null;
  const whatsappMessage = `Bonjour ${devis.clientName}, voici votre devis ${devis.ref} (${devis.projectLabel}) — ${formatCurrencyDA(devis.amount)}. N'hésitez pas à nous contacter pour toute question.`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/devis"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux devis
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{devis.ref}</h1>
              <Badge variant={STATUS_VARIANT[devis.status]}>{devis.status}</Badge>
              <Badge variant="outline">v{devis.version}</Badge>
              {config && <Badge variant="outline">Depuis le configurateur</Badge>}
            </div>
            <p className="mt-1 text-sm text-text-muted">{devis.projectLabel}</p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> {devis.clientName}
              </div>
              {contactPhone && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Phone className="h-4 w-4 shrink-0 text-text-muted" /> {contactPhone}
                </div>
              )}
              {contactEmail && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                  <Mail className="h-4 w-4 shrink-0 text-text-muted" /> {contactEmail}
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" />
                Commercial : {devis.commercial ?? <Badge variant="warning">Non assigné</Badge>}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Créé le {formatShortDate(devis.createdAt)}
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            <div className="text-right">
              <p className="text-xs text-text-muted">{lineItems.length > 0 ? "Montant (calculé)" : "Montant"}</p>
              <p className="text-xl font-medium text-text-primary">{formatCurrencyDA(devis.amount)}</p>
            </div>
            <DevisStatusSelect devisId={devis.id} status={devis.status} />
            <DevisFormDialog
              devis={devis}
              clients={clientOptions}
              leads={leadOptions}
              projects={projectOptions}
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

      {(lead || client || project) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {lead && (
            <Link href={`/dashboard/leads/${lead.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <Target className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Lead lié</p>
                <p className="font-medium text-text-primary">{lead.name}</p>
                <p className="text-xs text-text-muted">{lead.status} · {lead.projectType}</p>
              </Card>
            </Link>
          )}
          {client && (
            <Link href={`/dashboard/clients/${client.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <Users className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Client lié</p>
                <p className="font-medium text-text-primary">{client.name}</p>
                <p className="text-xs text-text-muted">{client.status} · {client.city}</p>
              </Card>
            </Link>
          )}
          {project && (
            <Link href={`/dashboard/projets/${project.id}`}>
              <Card className="flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-elevation-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Projet lié</p>
                <p className="font-medium text-text-primary">{project.ref}</p>
                <p className="text-xs text-text-muted">{project.stage} · {project.name}</p>
              </Card>
            </Link>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Dupliquer, réviser, envoyer ou générer le document de ce devis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {devis.status === "Accepté" && !devis.projectRef && <ConvertToProjectButton devisId={devis.id} />}
          <DuplicateDevisButton devisId={devis.id} />
          <NewVersionDialog devis={devis} />
          <SendEmailButton devisId={devis.id} />
          <WhatsAppShareLink phone={contactPhone} message={whatsappMessage} />
          <Button type="button" variant="outline" asChild>
            <Link href={`/devis-pdf/${devis.id}`} target="_blank" rel="noopener noreferrer">
              <FileOutput className="h-3.5 w-3.5" /> Document (PDF / Imprimer)
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Chiffrage</CardTitle>
            <CardDescription>Quantité × prix unitaire, remise, taxe, acompte et solde restant.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PricingSection devis={devis} lines={lineItems} totals={totals} catalogueByCategory={catalogueByCategory} />
        </CardContent>
      </Card>

      {devis.clientNote && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]">
              <MessageSquareWarning className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Réponse du client</CardTitle>
              <CardDescription>
                {devis.status === "Refusé" ? "Motif du refus" : "Modifications demandées"}
                {devis.decidedAt && ` · ${formatShortDate(devis.decidedAt)}`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-text-secondary">{devis.clientNote}</p>
          </CardContent>
        </Card>
      )}

      {config && (
        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <ChefHat className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Configuration de la cuisine</CardTitle>
              <CardDescription>Chaque sélection faite par le client dans le configurateur.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <KitchenConfigSummary config={config} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Projet lié</CardTitle>
            <CardDescription>Une fois le devis accepté et le projet lancé, reliez-le ici.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <LinkProjectSelect devisId={devis.id} projectRef={devis.projectRef} projectOptions={projectOptions} />
        </CardContent>
      </Card>

      {versions.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <HistoryIcon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Historique des versions</CardTitle>
              <CardDescription>Les versions précédentes de ce devis, conservées lors de chaque révision.</CardDescription>
            </div>
          </CardHeader>
          <DevisVersionsTable versions={versions} />
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
              <Files className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Devis PDF, contrat, facture, plans, croquis… liés à ce devis.</CardDescription>
            </div>
          </div>
          <UploadDocumentDialog
            lockedClientId={devis.clientId ?? undefined}
            lockedClientName={devis.clientName}
            lockedDevisId={devis.id}
            lockedProjectRef={devis.projectRef ?? undefined}
            projectOptions={devis.projectRef ? undefined : projectOptions}
            trigger={
              <Button type="button" size="sm" variant="outline">
                <Upload className="h-3.5 w-3.5" /> Ajouter
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0 px-2 pb-2">
          {documents.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">Aucun document lié à ce devis.</p>
          ) : (
            <ul className="flex flex-col">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5 last:border-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                    <DocumentCategoryIcon category={doc.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/documents/${doc.id}`} className="truncate text-sm font-medium text-text-primary hover:text-text-accent">
                      {doc.name}
                    </Link>
                    <p className="text-xs text-text-muted">{doc.category} · v{doc.version}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatShortDate(doc.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
