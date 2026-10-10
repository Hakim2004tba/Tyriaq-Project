import { requirePermission } from "@/lib/auth/session";
import { TeamTable } from "@/components/dashboard/team-table";

export default async function EquipePage() {
  const user = await requirePermission("equipe.manage");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
          Équipe
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Gérez les comptes de votre équipe et leurs rôles d&rsquo;accès.
        </p>
      </div>

      <TeamTable currentUserId={user.id} />
    </div>
  );
}
