"use client";

import {
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  HardDrive,
  KeyRound,
  ListChecks,
  Mail,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Button,
  Sheet,
  SheetContent,
} from "@flow/ui";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { notWired } from "@/components/admin/confirm-dialog";
import {
  AUDIT,
  WORKSPACES,
  formatDate,
  formatStorage,
  formatWhen,
  type AdminUser,
} from "@/lib/data/admin-sample";

/**
 * One person, in full.
 *
 * A panel rather than a page: an operator scanning a list is comparing
 * accounts, and a full navigation loses the row, the filters and the
 * scroll position every time they glance at one.
 */
export function UserPanel({
  user,
  onClose,
  onSuspend,
  onActivate,
  onDelete,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSuspend: (user: AdminUser) => void;
  onActivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  const workspace = user ? WORKSPACES.find((w) => w.id === user.workspaceId) : undefined;
  const activity = user
    ? AUDIT.filter((entry) => entry.target.includes(user.email)).slice(0, 4)
    : [];

  return (
    <Sheet open={Boolean(user)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent width="lg" className="p-0" aria-describedby={undefined}>
        {user && (
          <div className="flex h-full flex-col overflow-y-auto">
            <header className="flex items-start gap-3 border-b border-border p-5 pr-14">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-h3 text-text-primary">{user.name}</h2>
                <p className="truncate text-body-sm text-text-muted">{user.email}</p>
                <p className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={user.status} />
                  <PlanBadge plan={user.plan} />
                  <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-caption text-text-secondary ring-1 ring-inset ring-border">
                    {user.role}
                  </span>
                </p>
              </div>
            </header>

            <div className="flex flex-col gap-5 p-5">
              <Section title="Account">
                <Row icon={Mail} label="Email" value={user.email} />
                <Row icon={MapPin} label="Country" value={user.country} />
                <Row icon={Clock} label="Joined" value={formatDate(user.joined)} />
                <Row icon={Clock} label="Last active" value={formatWhen(user.lastActive)} />
              </Section>

              <Section title="Workspace">
                {workspace ? (
                  <>
                    <Row icon={Building2} label="Name" value={workspace.name} />
                    <Row icon={CreditCard} label="Plan" value={workspace.plan} />
                    <Row icon={ListChecks} label="Projects" value={String(workspace.projects)} />
                    <Row
                      icon={HardDrive}
                      label="Storage used"
                      value={`${formatStorage(workspace.storageMb)}${
                        workspace.storageLimitMb ? ` of ${formatStorage(workspace.storageLimitMb)}` : ""
                      }`}
                    />
                  </>
                ) : (
                  <p className="text-body-sm text-text-muted">Not in any workspace.</p>
                )}
              </Section>

              <Section title="Usage">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Tasks created" value={user.tasksCreated.toLocaleString()} />
                  <Stat label="Storage" value={formatStorage(user.storageMb)} />
                </div>
              </Section>

              <Section title="Recent activity">
                {activity.length === 0 ? (
                  <p className="text-body-sm text-text-muted">
                    Nothing recorded against this account.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {activity.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-2 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-text-secondary">
                            {entry.action}
                          </span>
                          <span className="block truncate text-caption text-text-muted">
                            by {entry.admin}
                          </span>
                        </span>
                        <span className="shrink-0 text-caption text-text-muted">
                          {formatWhen(entry.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Admin actions">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => notWired("Password reset sent")}>
                    <KeyRound className="size-3.5" />
                    Reset password
                  </Button>
                  {user.status === "suspended" ? (
                    <Button variant="secondary" size="sm" onClick={() => onActivate(user)}>
                      <CheckCircle2 className="size-3.5" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => onSuspend(user)}>
                      <Ban className="size-3.5" />
                      Suspend
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => onDelete(user)}>
                    <Trash2 className="size-3.5" />
                    Delete account
                  </Button>
                </div>
              </Section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <p className="flex items-center gap-2 text-body-sm">
      <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="text-text-muted">{label}</span>
      <span className="ml-auto min-w-0 truncate text-text-primary">{value}</span>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <span className="block text-caption text-text-muted">{label}</span>
      <span className="block text-h4 tabular text-text-primary">{value}</span>
    </span>
  );
}
