import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion — ART Cuisine" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour parmi nous"
      description="Connectez-vous pour accéder à votre espace ART Cuisine."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
