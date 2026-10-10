"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateSavTicket } from "@/lib/actions/sav";
import { SAV_STATUSES } from "@/lib/data/operations";
import type { SavRecord } from "@/lib/data/operations";

function SavStatusForm({ ticket }: { ticket: SavRecord }) {
  const router = useRouter();
  const [status, setStatus] = React.useState(ticket.status);
  const [assignedTo, setAssignedTo] = React.useState(ticket.assignedTo);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSave() {
    setSubmitting(true);
    const result = await updateSavTicket(ticket.id, { status, assignedTo });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ticket mis à jour");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as SavRecord["status"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SAV_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="sav-assignee">Assigné à</Label>
        <Input id="sav-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Nom du technicien" />
      </div>
      <Button type="button" onClick={handleSave} disabled={submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}

export { SavStatusForm };
