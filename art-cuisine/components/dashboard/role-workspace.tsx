import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Paintbrush,
  Factory,
  Wrench,
  Headset,
  FolderKanban,
  CalendarClock,
  Palette,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { getClientByEmail } from "@/lib/data/clients";
import { getProjectsForClient, STAGE_BADGE } from "@/lib/data/project-records";
import { getDevisForClient, isDevisAwaitingClient } from "@/lib/data/devis";
import { getSavTicketsForClient } from "@/lib/data/sav";
import { getMontageJobsForProject } from "@/lib/data/montage";
import { getConversationsForUser, isConversationUnread } from "@/lib/data/conversations";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { formatShortDateTime } from "@/lib/format";

function Greeting({ user }: { user: SessionUser }) {
  const firstName = user.name.split(" ")[0];
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
        Bonjour {firstName},
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Votre espace {ROLE_LABELS[user.role as Role].toLowerCase()} — voici où vous en êtes aujourd&rsquo;hui.
      </p>
    </div>
  );
}

function DesignerWorkspace({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-col gap-6">
      <Greeting user={user} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="En attente" value="12" icon={Palette} helperText="designs à traiter" />
        <StatCard label="En cours" value="18" icon={FolderKanban} trend={{ value: "+5", direction: "up" }} helperText="designs en cours" />
        <StatCard label="En validation" value="9" icon={FileText} helperText="en attente client" />
        <StatCard label="Terminés" value="46" icon={TrendingUp} trend={{ value: "+8", direction: "up" }} helperText="ce mois-ci" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prochains rendus à livrer</CardTitle>
          <CardDescription>Vos projets de conception les plus urgents.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {[
            { label: "Villa Belkacem — Plans + 3D", badge: "En cours" as const },
            { label: "Résidence Amina — Validation client", badge: "En validation" as const },
            { label: "Maison Moderne — Révisions", badge: "Révisions" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <span className="text-text-secondary">{item.label}</span>
              <Badge variant="info">{item.badge}</Badge>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">Voir tous les designs</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ProductionWorkspace({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-col gap-6">
      <Greeting user={user} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="En file d'attente" value="7" icon={Factory} helperText="à démarrer cette semaine" />
        <StatCard label="En fabrication" value="14" icon={Wrench} trend={{ value: "+3", direction: "up" }} helperText="en atelier" />
        <StatCard label="Terminées" value="32" icon={TrendingUp} trend={{ value: "+6", direction: "up" }} helperText="ce mois-ci" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ordres de fabrication</CardTitle>
          <CardDescription>Suivi des caissons, façades et plans de travail en cours.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {[
            { label: "PROJ-2025-040 — Résidence Amina", badge: "En cours" as const },
            { label: "PROJ-2025-036 — Appartement Centre", badge: "À démarrer" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <span className="text-text-secondary">{item.label}</span>
              <Badge variant="warning">{item.badge}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function VernisseurWorkspace({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-col gap-6">
      <Greeting user={user} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="À vernir" value="5" icon={Paintbrush} helperText="prêtes à traiter" />
        <StatCard label="En cours" value="3" icon={Wrench} helperText="en cabine" />
        <StatCard label="Terminées" value="14" icon={TrendingUp} trend={{ value: "+4", direction: "up" }} helperText="cette semaine" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planning de vernissage</CardTitle>
          <CardDescription>Les prochaines pièces à traiter, par ordre de priorité.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {[
            { label: "Villa Benali — Façades chêne", badge: "Aujourd'hui" as const },
            { label: "Appartement Oran — Caissons laqués", badge: "Demain" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <span className="text-text-secondary">{item.label}</span>
              <Badge variant="gold">{item.badge}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MontageWorkspace({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-col gap-6">
      <Greeting user={user} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Poses planifiées" value="4" icon={CalendarClock} helperText="cette semaine" />
        <StatCard label="En cours" value="2" icon={Wrench} helperText="chantiers actifs" />
        <StatCard label="SAV en attente" value="3" icon={Headset} helperText="interventions à planifier" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planning de pose</CardTitle>
          <CardDescription>Vos prochains rendez-vous chantier.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {[
            { label: "Villa Les Pins — Montage complet", badge: "Demain, 08:00" as const },
            { label: "Ticket SAV-0021 — Porte bloquée", badge: "À planifier" as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <span className="text-text-secondary">{item.label}</span>
              <Badge variant="neutral">{item.badge}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function ClientWorkspace({ user }: { user: SessionUser }) {
  const client = await getClientByEmail(user.email);

  if (!client) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting user={user} />
        <Card className="p-10 text-center text-sm text-text-muted">
          Aucune fiche client n&rsquo;est associée à votre compte pour le moment. Contactez votre commercial.
        </Card>
      </div>
    );
  }

  const projects = getProjectsForClient(client.id);
  const activeProjects = projects.filter((p) => p.stage !== "Terminé");
  const devis = await getDevisForClient(client.id);
  const devisAwaiting = devis.filter((d) => isDevisAwaitingClient(d.status));
  const savTickets = getSavTicketsForClient(client.id);
  const openSav = savTickets.filter((t) => t.status !== "Résolu");
  const conversations = getConversationsForUser(user);
  const unreadConversations = conversations.filter((c) => isConversationUnread(c, user));
  const unreadNotifications = getUnreadNotificationCount(user.email);

  const nextMontage = activeProjects
    .flatMap((p) => getMontageJobsForProject(p.ref))
    .filter((j) => !j.cancelled && j.stage !== "Terminé")
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];

  const featured = activeProjects[0];

  return (
    <div className="flex flex-col gap-6">
      <Greeting user={user} />

      {featured && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{featured.name}</CardTitle>
            <CardDescription>{featured.ref} · Suivi en temps réel.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Avancement</span>
              <span className="font-medium text-text-primary">{featured.stage} — {featured.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-accent" style={{ width: `${featured.progress}%` }} />
            </div>
            {nextMontage && (
              <p className="text-xs text-text-muted">Installation prévue le {formatShortDateTime(nextMontage.scheduledDate)}</p>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Badge variant={STAGE_BADGE[featured.stage]}>{featured.stage}</Badge>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/mes-projets">Voir le détail</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Devis en attente" value={String(devisAwaiting.length)} icon={FileText} helperText="en attente de votre accord" />
        <StatCard label="Projets" value={String(activeProjects.length)} icon={FolderKanban} helperText="en cours de réalisation" />
        <StatCard label="Messages non lus" value={String(unreadConversations.length)} icon={MessageSquare} helperText="conversations" />
        <StatCard label="Demandes SAV" value={String(openSav.length)} icon={Headset} helperText={openSav.length > 0 ? "en cours" : "aucune demande active"} />
      </div>

      {unreadNotifications > 0 && (
        <Card className="flex items-center justify-between p-4">
          <p className="text-sm text-text-secondary">{unreadNotifications} notification{unreadNotifications > 1 ? "s" : ""} non lue{unreadNotifications > 1 ? "s" : ""}</p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/notifications">Voir</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

/** Renders a distinct home workspace per role, all sharing the same layout shell. */
function RoleWorkspace({ user }: { user: SessionUser }) {
  switch (user.role as Role) {
    case "designer":
      return <DesignerWorkspace user={user} />;
    case "production":
      return <ProductionWorkspace user={user} />;
    case "vernisseur":
      return <VernisseurWorkspace user={user} />;
    case "montage":
      return <MontageWorkspace user={user} />;
    case "client":
      return <ClientWorkspace user={user} />;
    default:
      return <Greeting user={user} />;
  }
}

export { RoleWorkspace };
