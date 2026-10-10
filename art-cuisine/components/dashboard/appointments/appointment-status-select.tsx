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
import { updateAppointmentStatus } from "@/lib/actions/appointments";
import { APPOINTMENT_STATUSES } from "@/lib/data/operations";
import type { AppointmentStatus } from "@/lib/data/operations";

function AppointmentStatusSelect({
  appointmentId,
  status,
  className,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateAppointmentStatus(appointmentId, value);
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
      <SelectTrigger className={className ?? "h-8 w-36 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPOINTMENT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { AppointmentStatusSelect };
