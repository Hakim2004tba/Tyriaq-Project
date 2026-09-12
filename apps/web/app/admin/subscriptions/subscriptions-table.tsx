"use client";

import { useState } from "react";
import { ArrowUpDown, MoreHorizontal, Receipt, RotateCcw, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { ConfirmDialog, notWired } from "@/components/admin/confirm-dialog";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import {
  PLANS,
  daysUntil,
  formatDate,
  formatMoney,
  type AdminSubscription,
} from "@/lib/data/admin-sample";

export function SubscriptionsTable({ subscriptions }: { subscriptions: AdminSubscription[] }) {
  const [rows, setRows] = useState(subscriptions);
  const [cancelling, setCancelling] = useState<AdminSubscription | null>(null);

  const columns: Column<AdminSubscription>[] = [
    {
      key: "customer",
      header: "Customer",
      value: (row) => row.customer,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-text-primary">{row.customer}</span>
          <span className="block truncate text-caption text-text-muted">{row.email}</span>
        </span>
      ),
    },
    {
      key: "workspace",
      header: "Workspace",
      value: (row) => row.workspace,
      hideBelow: "md",
      cell: (row) => <span className="block max-w-[11rem] truncate text-text-secondary">{row.workspace}</span>,
    },
    { key: "plan", header: "Plan", value: (row) => row.plan, cell: (row) => <PlanBadge plan={row.plan} /> },
    { key: "status", header: "Status", value: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "cycle",
      header: "Cycle",
      value: (row) => row.cycle,
      hideBelow: "lg",
      cell: (row) => <span className="capitalize text-text-secondary">{row.cycle}</span>,
    },
    {
      key: "renews",
      header: "Renews",
      value: (row) => row.renews,
      hideBelow: "sm",
      cell: (row) => {
        const days = daysUntil(row.renews);
        // A renewal that has already passed on a live subscription is the
        // thing an operator most needs to spot, so it says so in words.
        const overdue = days < 0 && row.status !== "cancelled";
        return (
          <span className={cn("whitespace-nowrap tabular", overdue ? "text-danger" : "text-text-muted")}>
            {overdue ? `${Math.abs(days)} d overdue` : formatDate(row.renews)}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      value: (row) => row.amount,
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap tabular text-text-primary">
          {formatMoney(row.amount)}
          <span className="text-text-muted">{row.cycle === "yearly" ? "/yr" : "/mo"}</span>
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`Actions for ${row.customer}`} size="sm">
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => notWired("Invoice opened")}>
                <Receipt className="size-4" />
                View invoices
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notWired("Plan change started")}>
                <ArrowUpDown className="size-4" />
                Change plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === "cancelled" ? (
                <DropdownMenuItem onSelect={() => notWired("Subscription reactivated")}>
                  <RotateCcw className="size-4" />
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem destructive onSelect={() => setCancelling(row)}>
                  <XCircle className="size-4" />
                  Cancel subscription
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const filters: Filter<AdminSubscription>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "trialing", label: "Trial" },
        { value: "past_due", label: "Past due" },
        { value: "cancelled", label: "Cancelled" },
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

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by customer, email or workspace…"
        emptyTitle="No subscriptions yet"
        emptyBody="Paid subscriptions appear here once somebody upgrades."
      />

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(next) => !next && setCancelling(null)}
        title={`Cancel ${cancelling?.customer}'s subscription?`}
        description={
          <>
            {cancelling?.workspace} drops to Free at the end of the current period. Members keep their
            data, but anything over the Free limits becomes read-only.
          </>
        }
        confirmLabel="Cancel subscription"
        onConfirm={() => {
          if (!cancelling) return;
          setRows((prev) =>
            prev.map((row) => (row.id === cancelling.id ? { ...row, status: "cancelled" } : row))
          );
          toast.success("Subscription cancelled — in this prototype only.");
          setCancelling(null);
        }}
      />
    </>
  );
}
