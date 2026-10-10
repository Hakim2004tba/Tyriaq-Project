"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { postJson, ApiError } from "@/lib/api-client";

function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await postJson("/api/auth/register", {
        name: form.get("name"),
        email: form.get("email"),
        password,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-name">Nom complet</Label>
        <Input
          id="register-name"
          name="name"
          icon={<User />}
          placeholder="Votre nom"
          autoComplete="name"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-email">Adresse e-mail</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          icon={<Mail />}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-password">Mot de passe</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          icon={<Lock />}
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-confirm">Confirmer le mot de passe</Label>
        <Input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          icon={<Lock />}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? "Création du compte…" : "Créer mon compte"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-text-muted">
        La création de compte vous ouvre un espace client pour suivre vos
        devis et projets. Pour un accès équipe, contactez votre administrateur.
      </p>

      <p className="text-center text-sm text-text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-text-primary hover:text-text-accent">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export { RegisterForm };
