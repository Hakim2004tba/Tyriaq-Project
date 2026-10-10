import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Phone, Mail, Building2, CalendarClock, FolderKanban } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { findUserById, toPublicUser } from "@/lib/auth/queries";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, isStaffRole, type Role } from "@/lib/auth/roles";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import {
  getEmployeeProfile,
  getAssignedProjectsForEmployee,
  getTasksForEmployeeRole,
  getActivityForEmployee,
  getEmployeePerformance,
} from "@/lib/data/equipe";
import { STAGE_BADGE, PRIORITY_BADGE } from "@/lib/data/project-records";
import { formatCurrencyDA, formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditEmployeeDialog } from "@/components/dashboard/equipe/edit-employee-dialog";
import { EmployeeRoleSelect } from "@/components/dashboard/equipe/employee-role-select";
import { ToggleActiveButton } from "@/components/dashboard/equipe/toggle-active-button";
import { AvailabilitySelect } from "@/components/dashboard/equipe/availability-select";
import { ActivityTab } from "@/components/dashboard/clients/client-profile-tabs";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export async function generateMetadata({ params }: PageProps<"/dashboard/equipe/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = findUserById(id);
  return { title: user ? `${user.name} — ART Cuisine` : "Équipe — ART Cuisine" };
}

export default async function EmployeeDetailPage({ params }: PageProps<"/dashboard/equipe/[id]">) {
  const session = await requirePermission("equipe.manage");
  const { id } = await params;

  const record = findUserById(id);
  if (!record || !isStaffRole(record.role)) notFound();
  const user = toPublicUser(record);
  const role = user.role as Role;
  const isSelf = user.id === session.id;

  const profile = getEmployeeProfile(user.email);
  const assignedProjects = getAssignedProjectsForEmployee(user.name);
  const tasks = getTasksForEmployeeRole(role);
  const activity = getActivityForEmployee(user.name);
  const performance = await getEmployeePerformance(role, user.name);
  const permissions = ROLE_PERMISSIONS[role];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard/equipe"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à l&rsquo;équipe
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-base">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">{user.name}</h1>
                <Badge variant={isSelf ? "gold" : "info"}>{ROLE_LABELS[role]}</Badge>
                <Badge variant={user.active ? "success" : "neutral"}>{user.active ? "Actif" : "Désactivé"}</Badge>
                <AvailabilitySelect userId={user.id} availability={profile.availability} note={profile.availabilityNote} />
              </div>
              <p className="mt-1 text-sm text-text-muted">{ROLE_DESCRIPTIONS[role]}</p>
              {profile.availabilityNote && (
                <p className="mt-1.5 text-xs text-text-muted">{profile.availabilityNote}</p>
              )}

              <dl className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Mail className="h-4 w-4 shrink-0 text-text-muted" /> {user.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Phone className="h-4 w-4 shrink-0 text-text-muted" /> {profile.phone}
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Building2 className="h-4 w-4 shrink-0 text-text-muted" /> {profile.department}
                  </div>
                )}
                {profile.hireDate && (
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <CalendarClock className="h-4 w-4 shrink-0 text-text-muted" /> Depuis le {formatShortDate(profile.hireDate)}
                  </div>
                )}
              </dl>
              {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary">{profile.bio}</p>}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:min-w-56">
            {!isSelf && <EmployeeRoleSelect userId={user.id} role={role} isSelf={isSelf} />}
            <EditEmployeeDialog user={user} profile={profile} />
            <ToggleActiveButton userId={user.id} active={Boolean(user.active)} isSelf={isSelf} />
            {isSelf && <p className="text-center text-xs text-text-muted">Vous ne pouvez pas modifier votre propre rôle ou statut ici.</p>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {performance.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{stat.label}</p>
            <p className="mt-1.5 text-lg font-medium text-text-primary">{stat.value}</p>
            {stat.helperText && <p className="text-xs text-text-muted">{stat.helperText}</p>}
          </Card>
        ))}
      </div>

      <Card className="p-2 sm:p-4">
        <Tabs defaultValue="projets">
          <TabsList className="flex-wrap">
            <TabsTrigger value="projets">Projets assignés ({assignedProjects.length})</TabsTrigger>
            <TabsTrigger value="taches">Tâches du rôle ({tasks.length})</TabsTrigger>
            <TabsTrigger value="activite">Activité</TabsTrigger>
            <TabsTrigger value="permissions">Permissions ({permissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projets" className="px-2 pb-2">
            {assignedProjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">Aucun projet assigné pour le moment.</p>
            ) : (
              <ul className="flex flex-col">
                {assignedProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-accent-strong">
                      <FolderKanban className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/projets/${p.id}`} className="truncate text-sm font-medium text-text-primary hover:text-text-accent">
                        {p.ref} — {p.name}
                      </Link>
                      <p className="text-xs text-text-muted">{p.clientName} · échéance {formatShortDate(p.dueDate)}</p>
                    </div>
                    <Badge variant={PRIORITY_BADGE[p.priority]}>{p.priority}</Badge>
                    <Badge variant={STAGE_BADGE[p.stage]}>{p.stage}</Badge>
                    <span className="w-16 shrink-0 text-right text-xs font-medium text-text-secondary">{formatCurrencyDA(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="taches" className="px-2 pb-2">
            <p className="px-1 pb-3 text-xs text-text-muted">
              Les tâches sont partagées par rôle dans cette application — voici celles de « {ROLE_LABELS[role]} », pas uniquement celles de {user.name}.
            </p>
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">Aucune tâche pour ce rôle.</p>
            ) : (
              <ul className="flex flex-col">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 border-b border-border-subtle py-3.5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-muted">{t.relatedRef} · échéance {formatShortDate(t.dueDate)}</p>
                    </div>
                    <Badge variant={t.status === "Terminée" ? "success" : t.status === "En cours" ? "info" : "neutral"}>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="activite" className="px-2 pb-2">
            <ActivityTab activity={activity} />
          </TabsContent>

          <TabsContent value="permissions" className="px-2 pb-2">
            <div className="flex flex-wrap gap-2 py-2">
              {PERMISSIONS.map((p) => (
                <Badge key={p} variant={permissions.includes(p) ? "success" : "outline"}>{p}</Badge>
              ))}
            </div>
            <p className="px-1 pt-3 text-xs text-text-muted">
              Les permissions découlent du rôle « {ROLE_LABELS[role]} » — elles ne se modifient pas individuellement.
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
