import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserRound,
  CalendarClock,
  Pencil,
  FileText,
  FolderKanban,
  Headset,
  Wallet,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerScope } from "@/lib/data/scope";
import { getClientById, getClientRelations, getClientFinancials } from "@/lib/data/clients";
import { getAppointmentsForClient } from "@/lib/data/appointments";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import type { ClientStatus } from "@/lib/data/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientFormDialog } from "@/components/dashboard/clients/client-form-dialog";
import { ClientDocumentsPanel } from "@/components/dashboard/clients/client-documents-panel";
import { ClientMessagesPanel } from "@/components/dashboard/clients/client-messages-panel";
import {
  ProjectsTab,
  DevisTab,
  PaymentsTab,
  SavTab,
  ActivityTab,
  AppointmentsTab,
} from "@/components/dashboard/clients/client-profile-tabs";

const STATUS_VARIANT: Record<ClientStatus, "success" | "gold" | "neutral" | "outline"> = {
  Actif: "success",
  VIP: "gold",
  Inactif: "neutral",
  Archivé: "outline",
};

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  return { title: client ? `${client.name} — ART Cuisine` : "Client — ART Cuisine" };
}

export default async function ClientProfilePage({ params }: PageProps<"/dashboard/clients/[id]">) {
  const user = await requirePermission("clients.manage");
  const scope = getOwnerScope(user);
  const { id } = await params;

  const client = await getClientById(id);
  if (!client) notFound();
  if (scope && client.commercial !== scope) notFound();

  const relations = await getClientRelations(client.name);
  const financials = getClientFinancials(client.name);
  const appointments = getAppointmentsForClient(client.id);
  const pendingDevis = relations.devis.filter((d) => d.status === "Envoyé" || d.status === "Vu").length;
  const openSav = relations.savTickets.filter((t) => t.status !== "Résolu").length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/dashboard/clients"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux clients
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
                {client.name}
              </h1>
              <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Client depuis le {formatShortDate(client.since)}
            </p>

            <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Phone className="h-4 w-4 shrink-0 text-text-muted" /> {client.phone}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Mail className="h-4 w-4 shrink-0 text-text-muted" /> {client.email}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary sm:col-span-2">
                <MapPin className="h-4 w-4 shrink-0 text-text-muted" /> {client.address}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <UserRound className="h-4 w-4 shrink-0 text-text-muted" /> Commercial : {client.commercial}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> {client.city}
              </div>
            </dl>
          </div>

          <ClientFormDialog
            client={client}
            lockedCommercial={scope ?? undefined}
            trigger={
              <Button variant="outline">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
            }
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total dépensé" value={formatCurrencyDA(financials.totalSpent)} icon={Wallet} helperText="paiements encaissés" />
        <StatCard label="Projets actifs" value={String(financials.activeProjects)} icon={FolderKanban} helperText={`sur ${financials.totalProjects} au total`} />
        <StatCard label="Devis en attente" value={String(pendingDevis)} icon={FileText} helperText="envoyés ou vus" />
        <StatCard label="Tickets SAV ouverts" value={String(openSav)} icon={Headset} helperText="à traiter" />
      </div>

      <Card className="p-2 sm:p-4">
        <Tabs defaultValue="projets">
          <TabsList className="flex-wrap">
            <TabsTrigger value="rendezvous">Rendez-vous ({appointments.length})</TabsTrigger>
            <TabsTrigger value="projets">Projets ({relations.projects.length})</TabsTrigger>
            <TabsTrigger value="devis">Devis ({relations.devis.length})</TabsTrigger>
            <TabsTrigger value="paiements">Paiements ({relations.payments.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({relations.documents.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages ({relations.messages.length})</TabsTrigger>
            <TabsTrigger value="sav">SAV ({relations.savTickets.length})</TabsTrigger>
            <TabsTrigger value="activite">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="rendezvous" className="px-2 pb-2">
            <AppointmentsTab appointments={appointments} />
          </TabsContent>
          <TabsContent value="projets" className="px-2 pb-2">
            <ProjectsTab projects={relations.projects} />
          </TabsContent>
          <TabsContent value="devis" className="px-2 pb-2">
            <DevisTab devis={relations.devis} />
          </TabsContent>
          <TabsContent value="paiements" className="px-2 pb-2">
            <PaymentsTab payments={relations.payments} />
          </TabsContent>
          <TabsContent value="documents" className="px-2 pb-2">
            <ClientDocumentsPanel clientId={client.id} clientName={client.name} documents={relations.documents} />
          </TabsContent>
          <TabsContent value="messages" className="px-2 pb-2">
            <ClientMessagesPanel clientId={client.id} messages={relations.messages} />
          </TabsContent>
          <TabsContent value="sav" className="px-2 pb-2">
            <SavTab tickets={relations.savTickets} />
          </TabsContent>
          <TabsContent value="activite" className="px-2 pb-2">
            <ActivityTab activity={relations.activity} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
