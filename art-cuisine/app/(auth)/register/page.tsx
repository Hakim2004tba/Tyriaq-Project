import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Créer un compte — ART Cuisine" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Créez votre espace client"
      description="Suivez vos devis, vos projets et vos échanges avec notre équipe."
    >
      <RegisterForm />
    </AuthShell>
  );
}
