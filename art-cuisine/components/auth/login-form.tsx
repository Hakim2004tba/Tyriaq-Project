"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { postJson, ApiError } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      await postJson("/api/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/dashboard") ? next : "/dashboard");
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
        <Label htmlFor="login-email">Adresse e-mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          icon={<Mail />}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Mot de passe</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-text-accent hover:opacity-70"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Input
          id="login-password"
          name="password"
          type="password"
          icon={<Lock />}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-text-primary hover:text-text-accent">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export { LoginForm };
