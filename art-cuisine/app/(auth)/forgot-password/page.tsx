import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublié — ART Cuisine" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Indiquez votre adresse e-mail, nous vous envoyons un lien de réinitialisation."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
