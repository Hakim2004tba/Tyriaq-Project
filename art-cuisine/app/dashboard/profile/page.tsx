import { requireSession } from "@/lib/auth/session";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { PasswordForm } from "@/components/dashboard/password-form";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";

export default async function ProfilePage() {
  const user = await requireSession();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-medium text-text-primary sm:text-3xl">
            Profil &amp; sécurité
          </h1>
          <Badge variant="gold">{ROLE_LABELS[user.role as Role]}</Badge>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          Gérez vos informations personnelles, votre mot de passe et vos sessions actives.
        </p>
      </div>

      <ProfileForm user={user} />
      <PasswordForm />
      <SessionsPanel />
    </div>
  );
}
