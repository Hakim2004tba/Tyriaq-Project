"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendDevisByEmail } from "@/lib/actions/devis";

function SendEmailButton({ devisId }: { devisId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const result = await sendDevisByEmail(devisId);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis envoyé par e-mail", { description: result.data.email });
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={pending}>
      <Mail className="h-3.5 w-3.5" /> {pending ? "Envoi…" : "Envoyer par e-mail"}
    </Button>
  );
}

export { SendEmailButton };
