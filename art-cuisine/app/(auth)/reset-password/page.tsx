import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe — ART Cuisine" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : (tokenParam ?? null);

  return (
    <AuthShell
      title="Nouveau mot de passe"
      description="Choisissez un nouveau mot de passe pour votre compte ART Cuisine."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
