import { Settings } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { WorkspacePlaceholder } from "@/components/dashboard/workspace-placeholder";

export default async function ParametresPage() {
  await requirePermission("parametres.manage");
  return (
    <WorkspacePlaceholder
      title="Paramètres"
      description="La configuration générale de l'entreprise, réservée aux administrateurs."
      icon={Settings}
    />
  );
}
