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
import { updateEmployeeRole } from "@/lib/actions/equipe";
import { ROLES, ROLE_LABELS, STAFF_ROLES, type Role } from "@/lib/auth/roles";

const STAFF_ROLE_VALUES = ROLES.filter((r): r is Role => STAFF_ROLES.includes(r));

function EmployeeRoleSelect({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (isSelf) return null;

  async function handleChange(value: string) {
    setPending(true);
    const result = await updateEmployeeRole(userId, value);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Rôle mis à jour");
    router.refresh();
  }

  return (
    <Select value={role} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {STAFF_ROLE_VALUES.map((r) => (
          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { EmployeeRoleSelect };
