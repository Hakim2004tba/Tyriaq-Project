"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, MoreHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Textarea,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { DataTable, type Column, type Filter } from "@/components/admin/data-table";
import { replyToTicket, setTicketStatus } from "@/lib/actions/admin";
import { PlanBadge, StatusBadge } from "@/components/admin/status-badge";
import { formatWhen, type SupportTicket } from "@/lib/data/admin-sample";

const PRIORITY_TONE: Record<SupportTicket["priority"], string> = {
  urgent: "text-danger",
  high: "text-warning",
  normal: "text-text-muted",
};

export function SupportTable({ tickets }: { tickets: SupportTicket[] }) {
  const [rows, setRows] = useState(tickets);
  const [replying, setReplying] = useState<SupportTicket | null>(null);
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [pending, startTransition] = useTransition();

  /** Optimistic, and put back if the server refuses. */
  function move(ticket: SupportTicket, status: SupportTicket["status"]) {
    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.id === ticket.id ? { ...row, status } : row))
    );
    startTransition(async () => {
      const result = await setTicketStatus(ticket.id, status);
      if (result.error) {
        setRows(previous);
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Updated.");
    });
  }

  function send() {
    if (!replying) return;
    const ticket = replying;
    const wasInternal = internal;
    startTransition(async () => {
      const result = await replyToTicket(ticket.id, draft, wasInternal);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // A reply moves an open ticket to waiting — on the customer now.
      if (!wasInternal) {
        setRows((current) =>
          current.map((row) =>
            row.id === ticket.id && row.status === "open" ? { ...row, status: "waiting" } : row
          )
        );
      }
      setDraft("");
      setInternal(false);
      setReplying(null);
      toast.success(result.message ?? "Sent.");
    });
  }

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
              <DropdownMenuItem onSelect={() => setReplying(row)}>
                <MessageSquare className="size-4" />
                Reply
              </DropdownMenuItem>
              {row.status !== "resolved" ? (
                <DropdownMenuItem onSelect={() => move(row, "resolved")}>
                  <CheckCircle2 className="size-4" />
                  Mark resolved
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => move(row, "open")}>
                  <MessageSquare className="size-4" />
                  Reopen
                </DropdownMenuItem>
              )}
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
    <>
      <DataTable
        rows={rows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by subject, requester or workspace…"
        emptyTitle="No tickets"
        emptyBody="Support requests appear here as customers send them."
      />

      <Dialog open={replying !== null} onOpenChange={(next) => !next && setReplying(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to {replying?.requester}</DialogTitle>
            <DialogDescription>{replying?.subject}</DialogDescription>
          </DialogHeader>

          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            placeholder={internal ? "A note for staff only…" : "Your reply…"}
            aria-label="Reply"
          />

          {/*
            An internal note is staff talking about a customer, and the
            policy on support_messages hides it from them. The switch is
            spelled out rather than an icon, because sending the wrong
            one of these is the classic support-tool accident.
          */}
          <label className="flex items-center gap-2 text-body-sm text-text-secondary">
            <input
              type="checkbox"
              checked={internal}
              onChange={(event) => setInternal(event.target.checked)}
              className="size-4 accent-[var(--color-primary,#7c5cff)]"
            />
            Internal note — the customer will not see this
          </label>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setReplying(null)}>
              Cancel
            </Button>
            <Button loading={pending} disabled={!draft.trim()} onClick={send}>
              {internal ? "Add note" : "Send reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
