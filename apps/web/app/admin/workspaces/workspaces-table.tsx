"use client";

import { useState } from "react";
import {
  Archive,
  Building2,
  Eye,
  HardDrive,
  ListChecks,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Progress,
  Sheet,
  SheetContent,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { ConfirmDialog, notWired } from "@/components/admin/confirm-dialog";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import {
  AUDIT,
  PLANS,
  USERS,
  formatDate,
  formatStorage,
  formatWhen,
  type AdminWorkspace,
} from "@/lib/data/admin-sample";

export function WorkspacesTable({ workspaces }: { workspaces: AdminWorkspace[] }) {
  const [rows, setRows] = useState(workspaces);
  const [open, setOpen] = useState<AdminWorkspace | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "archive" | "delete"; target: AdminWorkspace } | null>(null);

  const columns: Column<AdminWorkspace>[] = [
    {
      key: "name",
      header: "Workspace",
      value: (row) => row.name,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-caption font-semibold text-text-secondary ring-1 ring-inset ring-border">
            {row.name.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-text-primary">{row.name}</span>
            <span className="block truncate text-caption text-text-muted">
              Created {formatDate(row.created)}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      value: (row) => row.ownerName,
      hideBelow: "md",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={row.ownerName} size="xs" />
          <span className="min-w-0 truncate text-text-secondary">{row.ownerName}</span>
        </span>
      ),
    },
    {
      key: "members",
      header: "Members",
      value: (row) => row.members,
      align: "right",
      hideBelow: "sm",
      cell: (row) => <span className="tabular text-text-secondary">{row.members}</span>,
    },
    { key: "plan", header: "Plan", value: (row) => row.plan, cell: (row) => <PlanBadge plan={row.plan} /> },
    {
      key: "projects",
      header: "Projects",
      value: (row) => row.projects,
      align: "right",
      hideBelow: "lg",
      cell: (row) => <span className="tabular text-text-secondary">{row.projects}</span>,
    },
    {
      key: "tasks",
      header: "Tasks",
      value: (row) => row.tasks,
      align: "right",
      hideBelow: "lg",
      cell: (row) => <span className="tabular text-text-secondary">{row.tasks.toLocaleString()}</span>,
    },
    {
      key: "storage",
      header: "Storage",
      value: (row) => row.storageMb,
      hideBelow: "xl",
      cell: (row) => {
        const pct = row.storageLimitMb ? Math.round((row.storageMb / row.storageLimitMb) * 100) : 0;
        return (
          <span className="flex min-w-[7rem] items-center gap-2">
            <Progress
              value={row.storageLimitMb ? pct : 4}
              tone={pct >= 90 ? "danger" : pct >= 70 ? "warning" : "brand"}
              label={`${row.name} storage`}
              className="flex-1"
            />
            <span className={cn("shrink-0 tabular text-caption", pct >= 90 ? "text-danger" : "text-text-muted")}>
              {row.storageLimitMb ? `${pct}%` : formatStorage(row.storageMb)}
            </span>
          </span>
        );
      },
    },
    { key: "status", header: "Status", value: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`Actions for ${row.name}`} size="sm">
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setOpen(row)}>
                <Eye className="size-4" />
                View workspace
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notWired("Owner emailed")}>
                <Users className="size-4" />
                Contact the owner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirm({ kind: "archive", target: row })}>
                <Archive className="size-4" />
                {row.status === "archived" ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => setConfirm({ kind: "delete", target: row })}>
                <Trash2 className="size-4" />
                Delete workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const filters: Filter<AdminWorkspace>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "over_limit", label: "Over limit" },
        { value: "archived", label: "Archived" },
      ],
      match: (row, value) => row.status === value,
    },
    {
      key: "plan",
      label: "Plan",
      options: PLANS.map((p) => ({ value: p.id, label: p.name })),
      match: (row, value) => row.plan === value,
    },
  ];

  const members = open ? USERS.filter((u) => u.workspaceId === open.id) : [];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by workspace or owner…"
        onRowClick={setOpen}
        emptyTitle="No workspaces yet"
        emptyBody="Customer workspaces appear here as they are created."
      />

      <Sheet open={Boolean(open)} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent width="lg" className="p-0" aria-describedby={undefined}>
          {open && (
            <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
              <header className="flex items-start gap-3 pr-10">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-h4 font-bold text-primary">
                  {open.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-h3 text-text-primary">{open.name}</h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={open.status} />
                    <PlanBadge plan={open.plan} />
                  </p>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { icon: Users, label: "Members", value: String(open.members) },
                  { icon: Building2, label: "Projects", value: String(open.projects) },
                  { icon: ListChecks, label: "Tasks", value: open.tasks.toLocaleString() },
                  { icon: HardDrive, label: "Storage", value: formatStorage(open.storageMb) },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <span key={stat.label} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                      <span className="flex items-center gap-1.5 text-caption text-text-muted">
                        <Icon className="size-3 shrink-0" aria-hidden="true" />
                        {stat.label}
                      </span>
                      <span className="mt-0.5 block text-h4 tabular text-text-primary">{stat.value}</span>
                    </span>
                  );
                })}
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Owner
                </h3>
                <span className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-muted px-3 py-2">
                  <Avatar name={open.ownerName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm text-text-primary">{open.ownerName}</span>
                    <span className="block truncate text-caption text-text-muted">{open.ownerEmail}</span>
                  </span>
                </span>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Members ({members.length})
                </h3>
                {members.length === 0 ? (
                  <p className="text-body-sm text-text-muted">Nobody else in this workspace.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center gap-2.5 py-2">
                        <Avatar name={member.name} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-body-sm text-text-secondary">
                          {member.name}
                        </span>
                        <span className="shrink-0 text-caption text-text-muted">{member.role}</span>
                        <StatusBadge status={member.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-caption font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Recent activity
                </h3>
                <ul className="flex flex-col divide-y divide-border">
                  {AUDIT.slice(0, 4).map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-text-secondary">{entry.action}</span>
                        <span className="block truncate text-caption text-text-muted">{entry.target}</span>
                      </span>
                      <span className="shrink-0 text-caption text-text-muted">{formatWhen(entry.at)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirm({ kind: "archive", target: open })}>
                  <Archive className="size-3.5" />
                  {open.status === "archived" ? "Restore" : "Archive"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirm({ kind: "delete", target: open })}>
                  <Trash2 className="size-3.5" />
                  Delete workspace
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={
          confirm?.kind === "delete"
            ? `Delete ${confirm.target.name}?`
            : `${confirm?.target.status === "archived" ? "Restore" : "Archive"} ${confirm?.target.name}?`
        }
        destructive={confirm?.kind === "delete"}
        description={
          confirm?.kind === "delete" ? (
            <>
              Every project, task, document and file in this workspace goes with it, for all{" "}
              {confirm.target.members} members. There is no undo.
            </>
          ) : (
            <>Archiving hides the workspace from its members and stops billing. Nothing is deleted.</>
          )
        }
        confirmText={confirm?.kind === "delete" ? confirm.target.name : undefined}
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Confirm"}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "delete") {
            setRows((prev) => prev.filter((row) => row.id !== confirm.target.id));
            setOpen(null);
          } else {
            setRows((prev) =>
              prev.map((row) =>
                row.id === confirm.target.id
                  ? { ...row, status: row.status === "archived" ? "active" : "archived" }
                  : row
              )
            );
          }
          toast.success(`${confirm.target.name} updated — in this prototype only.`);
          setConfirm(null);
        }}
      />
    </>
  );
}
