"use client";

import { useState } from "react";
import { setUserSuspended } from "@/lib/actions/admin";
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  KeyRound,
  Mail,
  MoreHorizontal,
  Trash2,
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
  toast,
} from "@flow/ui";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { ConfirmDialog, notWired } from "@/components/admin/confirm-dialog";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { UserPanel } from "./user-panel";
import { PLANS, formatDate, formatWhen, type AdminUser } from "@/lib/data/admin-sample";

/**
 * The user list.
 *
 * Row click opens the detail panel; the actions menu stops propagation
 * so choosing "Suspend" does not also open the person underneath it.
 */
export function UsersTable({ users }: { users: AdminUser[] }) {
  const [rows, setRows] = useState(users);
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "suspend" | "activate" | "delete"; targets: AdminUser[]; clear?: () => void }
    | null
  >(null);

  function apply(targets: AdminUser[], status: AdminUser["status"]) {
    const ids = new Set(targets.map((t) => t.id));
    setRows((prev) => prev.map((row) => (ids.has(row.id) ? { ...row, status } : row)));
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      value: (row) => row.name,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-text-primary">{row.name}</span>
            <span className="block truncate text-caption text-text-muted">{row.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "workspace",
      header: "Workspace",
      value: (row) => row.workspace,
      hideBelow: "md",
      cell: (row) => (
        <span className="block max-w-[12rem] truncate text-text-secondary">{row.workspace}</span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      value: (row) => row.plan,
      hideBelow: "sm",
      cell: (row) => <PlanBadge plan={row.plan} />,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "joined",
      header: "Joined",
      value: (row) => row.joined,
      hideBelow: "lg",
      cell: (row) => <span className="whitespace-nowrap tabular text-text-muted">{formatDate(row.joined)}</span>,
    },
    {
      key: "lastActive",
      header: "Last active",
      value: (row) => row.lastActive,
      hideBelow: "xl",
      cell: (row) => <span className="whitespace-nowrap tabular text-text-muted">{formatWhen(row.lastActive)}</span>,
    },
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => setOpen(row)}>
                <Eye className="size-4" />
                View user
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notWired("Email sent")}>
                <Mail className="size-4" />
                Email this person
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notWired("Password reset sent")}>
                <KeyRound className="size-4" />
                Send a password reset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === "suspended" ? (
                <DropdownMenuItem onSelect={() => setConfirm({ kind: "activate", targets: [row] })}>
                  <CheckCircle2 className="size-4" />
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirm({ kind: "suspend", targets: [row] })}>
                  <Ban className="size-4" />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem destructive onSelect={() => setConfirm({ kind: "delete", targets: [row] })}>
                <Trash2 className="size-4" />
                Delete account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const filters: Filter<AdminUser>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
        { value: "suspended", label: "Suspended" },
      ],
      match: (row, value) => row.status === value,
    },
    {
      key: "plan",
      label: "Plan",
      options: PLANS.map((plan) => ({ value: plan.id, label: plan.name })),
      match: (row, value) => row.plan === value,
    },
  ];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by name, email or workspace…"
        onRowClick={setOpen}
        emptyTitle="No users yet"
        emptyBody="Accounts appear here as people sign up."
        toolbar={
          <Button variant="secondary" size="sm" onClick={() => notWired("Export started")}>
            <Download className="size-3.5" />
            Export
          </Button>
        }
        bulkActions={(selected, clear) => (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirm({ kind: "suspend", targets: selected, clear })}
            >
              <Ban className="size-3.5" />
              Suspend
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirm({ kind: "activate", targets: selected, clear })}
            >
              <CheckCircle2 className="size-3.5" />
              Reactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirm({ kind: "delete", targets: selected, clear })}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </>
        )}
      />

      <UserPanel
        user={open}
        onClose={() => setOpen(null)}
        onSuspend={(user) => setConfirm({ kind: "suspend", targets: [user] })}
        onActivate={(user) => setConfirm({ kind: "activate", targets: [user] })}
        onDelete={(user) => setConfirm({ kind: "delete", targets: [user] })}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(next) => !next && setConfirm(null)}
        destructive={confirm?.kind !== "activate"}
        title={
          confirm?.kind === "delete"
            ? `Delete ${confirm.targets.length === 1 ? confirm.targets[0]!.name : `${confirm.targets.length} accounts`}?`
            : confirm?.kind === "suspend"
              ? `Suspend ${confirm.targets.length === 1 ? confirm.targets[0]!.name : `${confirm.targets.length} accounts`}?`
              : `Reactivate ${confirm?.targets.length === 1 ? confirm.targets[0]!.name : `${confirm?.targets.length} accounts`}?`
        }
        description={
          confirm?.kind === "delete" ? (
            <>
              This removes the account and everything only they can see. It cannot be undone — for a
              reversible measure, suspend instead.
            </>
          ) : confirm?.kind === "suspend" ? (
            <>They are signed out immediately and cannot sign back in. Their data is untouched, and
              you can reactivate them at any time.</>
          ) : (
            <>They will be able to sign in again straight away.</>
          )
        }
        /* Typed confirmation only where there is no way back. */
        confirmText={
          confirm?.kind === "delete" && confirm.targets.length === 1
            ? confirm.targets[0]!.email
            : undefined
        }
        confirmLabel={
          confirm?.kind === "delete" ? "Delete" : confirm?.kind === "suspend" ? "Suspend" : "Reactivate"
        }
        onConfirm={() => {
          if (!confirm) return;
          const targets = confirm.targets;

          if (confirm.kind === "delete") {
            /*
              Deleting an account is not offered for real, and saying so
              is better than doing something else quietly. It would have
              to decide what happens to everything they wrote, and
              "suspended" is the reversible answer to almost every reason
              somebody reaches for delete.
            */
            toast.info("Deleting accounts is not available — suspend instead.");
            setConfirm(null);
            return;
          }

          const suspending = confirm.kind === "suspend";
          apply(targets, suspending ? "suspended" : "active");
          confirm.clear?.();
          setConfirm(null);

          void Promise.all(
            targets.map((target) => setUserSuspended(target.id, suspending))
          ).then((results) => {
            const failed = results.filter((result) => result.error);
            if (failed.length > 0) {
              // Put them back: the table was showing a state the server
              // refused.
              apply(targets, suspending ? "active" : "suspended");
              toast.error(failed[0]!.error ?? "Could not change those accounts.");
              return;
            }
            toast.success(
              `${targets.length} ${targets.length === 1 ? "account" : "accounts"} ${
                suspending ? "suspended" : "restored"
              }.`
            );
          });
        }}
      />
    </>
  );
}
