"use client";

import {
  Building2,
  CreditCard,
  Download,
  Layers,
  Server,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@flow/ui";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { notWired } from "@/components/admin/confirm-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatWhen, type AuditEntry } from "@/lib/data/admin-sample";

const KIND_ICON: Record<AuditEntry["kind"], typeof User> = {
  user: User,
  workspace: Building2,
  subscription: CreditCard,
  plan: Layers,
  permission: ShieldCheck,
  system: Server,
};

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  const columns: Column<AuditEntry>[] = [
    {
      key: "action",
      header: "Action",
      value: (row) => row.action,
      cell: (row) => {
        const Icon = KIND_ICON[row.kind];
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-secondary">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-text-primary">{row.action}</span>
              <span className="block truncate text-caption text-text-muted">{row.target}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "admin",
      header: "Administrator",
      value: (row) => row.admin,
      hideBelow: "sm",
      cell: (row) => <span className="whitespace-nowrap text-text-secondary">{row.admin}</span>,
    },
    {
      key: "at",
      header: "When",
      value: (row) => row.at,
      hideBelow: "md",
      cell: (row) => <span className="whitespace-nowrap tabular text-text-muted">{formatWhen(row.at)}</span>,
    },
    {
      key: "ip",
      header: "Origin",
      value: (row) => row.ip,
      hideBelow: "lg",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate tabular text-text-secondary">{row.ip}</span>
          <span className="block truncate text-caption tabular text-text-muted">{row.session}</span>
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      value: (row) => row.result,
      align: "right",
      cell: (row) => <StatusBadge status={row.result} />,
    },
  ];

  const filters: Filter<AuditEntry>[] = [
    {
      key: "kind",
      label: "Type",
      options: [
        { value: "user", label: "Users" },
        { value: "workspace", label: "Workspaces" },
        { value: "subscription", label: "Subscriptions" },
        { value: "plan", label: "Plans" },
        { value: "permission", label: "Permissions" },
        { value: "system", label: "System" },
      ],
      match: (row, value) => row.kind === value,
    },
    {
      key: "result",
      label: "Result",
      options: [
        { value: "success", label: "Succeeded" },
        { value: "failed", label: "Failed" },
        { value: "denied", label: "Denied" },
      ],
      match: (row, value) => row.result === value,
    },
  ];

  return (
    <DataTable
      rows={entries}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search by action, target or administrator…"
      emptyTitle="Nothing logged yet"
      emptyBody="Administrative actions are recorded here as they happen."
      pageSize={10}
      toolbar={
        <Button variant="secondary" size="sm" onClick={() => notWired("Export started")}>
          <Download className="size-3.5" />
          Export
        </Button>
      }
    />
  );
}
