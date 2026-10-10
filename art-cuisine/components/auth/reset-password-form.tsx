"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { postJson, ApiError } from "@/lib/api-client";

function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
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
      await postJson("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <FormMessage>
        Ce lien de réinitialisation est incomplet.{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Demander un nouveau lien
        </Link>
        .
      </FormMessage>
    );
  }

  if (done) {
    return (
      <FormMessage variant="success">
        Votre mot de passe a été mis à jour. Redirection vers la connexion…
      </FormMessage>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">Nouveau mot de passe</Label>
        <Input
          id="reset-password"
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
        <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
        <Input
          id="reset-confirm"
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
        {submitting ? "Mise à jour…" : "Réinitialiser le mot de passe"}
      </Button>
    </form>
  );
}

export { ResetPasswordForm };
