import { BarChart3 } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { WorkspacePlaceholder } from "@/components/dashboard/workspace-placeholder";

export default async function RapportsPage() {
  await requirePermission("rapports.view");
  return (
    <WorkspacePlaceholder
      title="Rapports"
      description="Les indicateurs de performance commerciale et opérationnelle."
      icon={BarChart3}
    />
  );
}
