"use client";

import { CheckCircle2, MessageSquare, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { notWired } from "@/components/admin/confirm-dialog";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { formatWhen, type SupportTicket } from "@/lib/data/admin-sample";

const PRIORITY_TONE: Record<SupportTicket["priority"], string> = {
  urgent: "text-danger",
  high: "text-warning",
  normal: "text-text-muted",
};

export function SupportTable({ tickets }: { tickets: SupportTicket[] }) {
  const columns: Column<SupportTicket>[] = [
    {
      key: "subject",
      header: "Ticket",
      value: (row) => row.subject,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-text-primary">{row.subject}</span>
          <span className="block truncate text-caption text-text-muted">
            {row.requester} · {row.workspace}
          </span>
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      value: (row) => row.priority,
      hideBelow: "sm",
      cell: (row) => (
        <span className={cn("capitalize", PRIORITY_TONE[row.priority])}>{row.priority}</span>
      ),
    },
    { key: "plan", header: "Plan", value: (row) => row.plan, hideBelow: "md", cell: (row) => <PlanBadge plan={row.plan} /> },
    { key: "status", header: "Status", value: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "opened",
      header: "Opened",
      value: (row) => row.opened,
      hideBelow: "lg",
      cell: (row) => <span className="whitespace-nowrap tabular text-text-muted">{formatWhen(row.opened)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={`Actions for ${row.subject}`} size="sm">
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => notWired("Reply opened")}>
                <MessageSquare className="size-4" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notWired("Ticket resolved")}>
                <CheckCircle2 className="size-4" />
                Mark resolved
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const filters: Filter<SupportTicket>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "open", label: "Open" },
        { value: "waiting", label: "Waiting" },
        { value: "resolved", label: "Resolved" },
      ],
      match: (row, value) => row.status === value,
    },
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "normal", label: "Normal" },
      ],
      match: (row, value) => row.priority === value,
    },
  ];

  return (
    <DataTable
      rows={tickets}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search by subject, requester or workspace…"
      emptyTitle="No tickets"
      emptyBody="Support requests appear here as customers send them."
    />
  );
}
