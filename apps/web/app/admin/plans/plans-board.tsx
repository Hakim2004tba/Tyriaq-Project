"use client";

import { useState } from "react";
import { savePlan } from "@/lib/actions/admin";
import { Archive, Check, MoreHorizontal, Pencil, Plus, Users } from "lucide-react";
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
  Input,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formatMoney, type AdminPlan } from "@/lib/data/admin-sample";

/**
 * Plans as cards rather than rows.
 *
 * A plan is a handful of numbers and a list of what you get — a table
 * would force the features into a cell nobody can read, and comparing
 * plans side by side is the actual job.
 */
export function PlansBoard({ plans }: { plans: AdminPlan[] }) {
  const [rows, setRows] = useState(plans);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<AdminPlan | null>(null);

  return (
    <>
      <div className="flex justify-end">
        <Button size="md" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New plan
        </Button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((plan) => (
          <li
            key={plan.id}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-xl border bg-surface p-4 shadow-card",
              plan.archived ? "border-border opacity-60" : "border-border"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-h4 text-text-primary">{plan.name}</h2>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-h2 tabular text-text-primary">{formatMoney(plan.price)}</span>
                  <span className="text-caption text-text-muted">
                    /{plan.cycle === "yearly" ? "year" : "month"}
                  </span>
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label={`Actions for ${plan.name}`} size="sm">
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => setEditing(plan)}>
                    <Pencil className="size-4" />
                    Edit plan
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive={!plan.archived} onSelect={() => setArchiving(plan)}>
                    <Archive className="size-4" />
                    {plan.archived ? "Restore" : "Archive"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <dl className="grid grid-cols-2 gap-2 text-caption">
              <div className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5">
                <dt className="text-text-muted">Members</dt>
                <dd className="text-body-sm tabular text-text-primary">
                  {plan.memberLimit ?? "Unlimited"}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5">
                <dt className="text-text-muted">Storage</dt>
                <dd className="text-body-sm tabular text-text-primary">
                  {plan.storageLimitGb ? `${plan.storageLimitGb} GB` : "Unlimited"}
                </dd>
              </div>
            </dl>

            <ul className="flex flex-1 flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5 text-body-sm text-text-secondary">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            <p className="flex items-center gap-1.5 border-t border-border pt-2.5 text-caption text-text-muted">
              <Users className="size-3.5 shrink-0" aria-hidden="true" />
              {plan.subscribers.toLocaleString()} subscribers
              {plan.archived && <span className="ml-auto text-text-muted">Archived</span>}
            </p>
          </li>
        ))}
      </ul>

      <PlanEditor
        plan={editing}
        open={editing !== null || creating}
        onOpenChange={(next) => {
          if (!next) {
            setEditing(null);
            setCreating(false);
          }
        }}
        onSave={(values) => {
          if (editing) {
            const previous = rows;
            setRows((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...values } : p)));
            void savePlan({
              id: editing.id,
              name: values.name,
              // Whole units on screen, minor units in the database.
              priceCents: Math.round(values.price * 100),
              memberLimit: values.memberLimit,
              projectLimit: editing.id === "free" ? 2 : null,
              storageLimitMb:
                values.storageLimitGb === null ? null : values.storageLimitGb * 1024,
              features: editing.features,
            }).then((result) => {
              if (result.error) {
                setRows(previous);
                toast.error(result.error);
                return;
              }
              toast.success(`${values.name} saved.`);
            });
          } else {
            setRows((prev) => [
              ...prev,
              {
                id: `custom-${Date.now()}` as AdminPlan["id"],
                subscribers: 0,
                features: ["Everything in Free"],
                cycle: "monthly",
                ...values,
              } as AdminPlan,
            ]);
            /*
              Creating a plan is deliberately local-only for now: a plan
              row needs an id that the code refers to by name (`free`,
              `team`), and letting somebody type one from here would let
              them create a plan nothing in the product knows about.
            */
            toast.info(`${values.name} is not saved — new plans are added in SQL for now.`);
          }
          setEditing(null);
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(next) => !next && setArchiving(null)}
        destructive={!archiving?.archived}
        title={`${archiving?.archived ? "Restore" : "Archive"} ${archiving?.name}?`}
        description={
          archiving?.archived ? (
            <>It becomes available for new subscriptions again.</>
          ) : (
            <>
              Nobody new can subscribe to it. The {archiving?.subscribers.toLocaleString()} people
              already on it keep it, and keep being billed, until they move.
            </>
          )
        }
        confirmLabel={archiving?.archived ? "Restore" : "Archive"}
        onConfirm={() => {
          if (!archiving) return;
          setRows((prev) =>
            prev.map((p) => (p.id === archiving.id ? { ...p, archived: !p.archived } : p))
          );
          toast.success(`${archiving.name} updated — in this prototype only.`);
          setArchiving(null);
        }}
      />
    </>
  );
}

function PlanEditor({
  plan,
  open,
  onOpenChange,
  onSave,
}: {
  plan: AdminPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { name: string; price: number; memberLimit: number | null; storageLimitGb: number | null }) => void;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(String(plan?.price ?? ""));
  const [members, setMembers] = useState(plan?.memberLimit?.toString() ?? "");
  const [storage, setStorage] = useState(plan?.storageLimitGb?.toString() ?? "");

  // Keyed by the plan so opening a different one starts from its values
  // rather than the last one edited.
  const key = plan?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" key={key}>
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New plan"}</DialogTitle>
          <DialogDescription>
            Changing a price does not re-bill anybody already subscribed; it applies from their next
            renewal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-text-secondary">Name</span>
            <Input defaultValue={plan?.name ?? ""} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-text-secondary">Price per month (USD)</span>
            <Input
              type="number"
              min={0}
              defaultValue={plan?.price ?? 0}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-secondary">Member limit</span>
              <Input
                type="number"
                min={0}
                placeholder="Unlimited"
                defaultValue={plan?.memberLimit ?? ""}
                onChange={(e) => setMembers(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-secondary">Storage (GB)</span>
              <Input
                type="number"
                min={0}
                placeholder="Unlimited"
                defaultValue={plan?.storageLimitGb ?? ""}
                onChange={(e) => setStorage(e.target.value)}
              />
            </label>
          </div>
          <p className="text-caption text-text-muted">Leave a limit empty for unlimited.</p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                name: (name || plan?.name) ?? "Untitled plan",
                price: Number(price || plan?.price || 0),
                memberLimit: members === "" ? null : Number(members),
                storageLimitGb: storage === "" ? null : Number(storage),
              })
            }
          >
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
