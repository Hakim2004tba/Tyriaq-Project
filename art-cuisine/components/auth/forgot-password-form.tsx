"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { postJson, ApiError } from "@/lib/api-client";

function ForgotPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      await postJson("/api/auth/forgot-password", { email: form.get("email") });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <FormMessage variant="success">
          Si un compte existe avec cette adresse, un e-mail de
          réinitialisation vient d&rsquo;être envoyé. Le lien est valable une
          heure.
        </FormMessage>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">Adresse e-mail</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          icon={<Mail />}
          placeholder="vous@exemple.com"
          autoComplete="email"
          required
        />
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
      </Link>
    </form>
  );
}

export { ForgotPasswordForm };
