import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  FolderKanban,
  Wallet,
  Headset,
  Users,
  FileText,
  Factory,
  Paintbrush,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { DocumentCategoryIcon } from "@/components/dashboard/documents/document-icon";
import { STAGE_BADGE } from "@/lib/data/project-records";
import { formatCurrencyDA, formatShortDate, formatRelativeTime } from "@/lib/format";
import type {
  ProjectRecord,
  DevisRecord,
  PaymentRecord,
  SavRecord,
  DocumentRecord,
  ActivityRecord,
  AppointmentRecord,
  AppointmentType,
  DevisStatus,
  PaymentStatus,
  SavPriority,
  SavStatus,
  ActivityCategory,
} from "@/lib/data/operations";

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-text-muted">
        {label}
      </TableCell>
    </TableRow>
  );
}

function ProjectsTab({ projects }: { projects: ProjectRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Référence</TableHead>
          <TableHead>Projet</TableHead>
          <TableHead>Étape</TableHead>
          <TableHead>Avancement</TableHead>
          <TableHead>Livraison</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.length === 0 && <EmptyRow colSpan={6} label="Aucun projet pour ce client." />}
        {projects.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium text-text-secondary">
              <Link href={`/dashboard/projets/${p.id}`} className="hover:text-text-accent">{p.ref}</Link>
            </TableCell>
            <TableCell>{p.name}</TableCell>
            <TableCell>
              <Badge variant={STAGE_BADGE[p.stage]}>{p.stage}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-xs text-text-muted">{p.progress}%</span>
              </div>
            </TableCell>
            <TableCell className="text-text-secondary">{formatShortDate(p.dueDate)}</TableCell>
            <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const DEVIS_BADGE: Record<DevisStatus, "neutral" | "info" | "warning" | "success" | "danger" | "gold"> = {
  Brouillon: "neutral",
  Envoyé: "info",
  Vu: "warning",
  Accepté: "success",
  Refusé: "danger",
  "Modification demandée": "gold",
};

function DevisTab({ devis }: { devis: DevisRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Référence</TableHead>
          <TableHead>Projet</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead>Valide jusqu&rsquo;au</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devis.length === 0 && <EmptyRow colSpan={6} label="Aucun devis pour ce client." />}
        {devis.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium text-text-secondary">
              <Link href={`/dashboard/devis/${d.id}`} className="hover:text-text-accent">{d.ref}</Link>
            </TableCell>
            <TableCell>{d.projectLabel}</TableCell>
            <TableCell>
              <Badge variant={DEVIS_BADGE[d.status]}>{d.status}</Badge>
            </TableCell>
            <TableCell className="text-text-secondary">{formatShortDate(d.createdAt)}</TableCell>
            <TableCell className="text-text-secondary">{formatShortDate(d.validUntil)}</TableCell>
            <TableCell className="text-right font-medium">{formatCurrencyDA(d.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const PAYMENT_BADGE: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  Payé: "success",
  "En attente": "warning",
  "En retard": "danger",
};

function PaymentsTab({ payments }: { payments: PaymentRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Échéance</TableHead>
          <TableHead>Projet</TableHead>
          <TableHead>Méthode</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length === 0 && <EmptyRow colSpan={6} label="Aucun paiement pour ce client." />}
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.label}</TableCell>
            <TableCell className="text-text-secondary">{p.projectRef}</TableCell>
            <TableCell className="text-text-secondary">{p.method}</TableCell>
            <TableCell>
              <Badge variant={PAYMENT_BADGE[p.status]}>{p.status}</Badge>
            </TableCell>
            <TableCell className="text-text-secondary">{formatShortDate(p.date)}</TableCell>
            <TableCell className="text-right font-medium">{formatCurrencyDA(p.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const SAV_PRIORITY_BADGE: Record<SavPriority, "neutral" | "info" | "warning" | "danger"> = {
  Basse: "neutral",
  Normale: "info",
  Haute: "warning",
  Urgente: "danger",
};

const SAV_STATUS_BADGE: Record<SavStatus, "danger" | "warning" | "info" | "success"> = {
  Ouvert: "danger",
  Planifié: "warning",
  "En cours": "info",
  Résolu: "success",
};

function SavTab({ tickets }: { tickets: SavRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Problème</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Assigné à</TableHead>
          <TableHead className="text-right">Ouvert</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.length === 0 && <EmptyRow colSpan={6} label="Aucune demande SAV pour ce client." />}
        {tickets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium text-text-secondary">{t.ref}</TableCell>
            <TableCell>{t.issue}</TableCell>
            <TableCell>
              <Badge variant={SAV_PRIORITY_BADGE[t.priority]}>{t.priority}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={SAV_STATUS_BADGE[t.status]}>{t.status}</Badge>
            </TableCell>
            <TableCell className="text-text-secondary">{t.assignedTo}</TableCell>
            <TableCell className="text-right text-xs text-text-muted">{formatRelativeTime(t.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DocumentsList({ documents }: { documents: DocumentRecord[] }) {
  if (documents.length === 0) {
    return <p className="px-1 py-10 text-center text-sm text-text-muted">Aucun document pour ce client.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-accent-strong">
            <DocumentCategoryIcon category={doc.category} />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/documents/${doc.id}`} className="truncate text-sm font-medium text-text-primary hover:text-text-accent">
              {doc.name}
            </Link>
            <p className="text-xs text-text-muted">
              {doc.category} · {doc.sizeLabel} · ajouté par {doc.uploadedBy}
            </p>
          </div>
          <span className="shrink-0 text-xs text-text-muted">{formatShortDate(doc.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

const CATEGORY_ICON: Record<ActivityCategory, typeof Users> = {
  lead: Target,
  devis: FileText,
  projet: FolderKanban,
  paiement: Wallet,
  sav: Headset,
  client: Users,
  production: Factory,
  vernissage: Paintbrush,
  montage: Wrench,
};

function ActivityTab({ activity }: { activity: ActivityRecord[] }) {
  if (activity.length === 0) {
    return <p className="px-1 py-10 text-center text-sm text-text-muted">Aucune activité enregistrée pour ce client.</p>;
  }

  return (
    <ol className="flex flex-col">
      {activity.map((a) => {
        const Icon = CATEGORY_ICON[a.category];
        return (
          <li key={a.id} className="flex items-start gap-3 border-b border-border-subtle py-4 last:border-0">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary">{a.message}</p>
              <p className="text-xs text-text-muted">{a.actor}</p>
            </div>
            <span className="shrink-0 text-xs text-stone-400">{formatRelativeTime(a.timestamp)}</span>
          </li>
        );
      })}
    </ol>
  );
}

const APPOINTMENT_TYPE_BADGE: Record<AppointmentType, "gold" | "info" | "warning" | "success" | "neutral"> = {
  Consultation: "gold",
  Showroom: "info",
  "Visite client": "warning",
  "Visite chantier": "success",
  Appel: "neutral",
};

function AppointmentsTab({ appointments }: { appointments: AppointmentRecord[] }) {
  if (appointments.length === 0) {
    return <p className="px-1 py-10 text-center text-sm text-text-muted">Aucun rendez-vous pour ce client.</p>;
  }

  return (
    <ul className="flex flex-col">
      {appointments.map((a) => {
        const date = new Date(a.date);
        return (
          <li key={a.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/rendez-vous/${a.id}`} className="text-sm font-medium text-text-primary hover:text-text-accent">
                {a.title}
              </Link>
              <p className="text-xs text-text-muted">
                {formatShortDate(a.date)} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.location}
              </p>
            </div>
            <Badge variant={APPOINTMENT_TYPE_BADGE[a.type]}>{a.type}</Badge>
            <span className="shrink-0 text-xs text-text-muted">{a.status}</span>
          </li>
        );
      })}
    </ul>
  );
}

export { ProjectsTab, DevisTab, PaymentsTab, SavTab, DocumentsList, ActivityTab, AppointmentsTab };
