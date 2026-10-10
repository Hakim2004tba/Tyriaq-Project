"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updatePaymentStatus } from "@/lib/actions/finance";
import type { PaymentStatus } from "@/lib/data/operations";

const PAYMENT_STATUSES: PaymentStatus[] = ["Payé", "En attente", "En retard"];

function PaymentStatusSelect({ paymentId, status, className }: { paymentId: string; status: PaymentStatus; className?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updatePaymentStatus(paymentId, value);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Statut mis à jour");
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className={className ?? "h-8 w-32 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { PaymentStatusSelect };
