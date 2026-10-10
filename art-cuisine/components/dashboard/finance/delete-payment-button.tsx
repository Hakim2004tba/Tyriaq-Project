"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deletePayment } from "@/lib/actions/finance";

function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleRemove() {
    setPending(true);
    const result = await deletePayment(paymentId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Paiement supprimé");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={pending}
      className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-[var(--status-danger-fg)]"
      aria-label="Supprimer le paiement"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

export { DeletePaymentButton };
