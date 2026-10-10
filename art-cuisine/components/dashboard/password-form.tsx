"use client";

import * as React from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormMessage } from "@/components/auth/form-message";
import { patchJson, ApiError } from "@/lib/api-client";

function PasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await patchJson("/api/profile/password", {
        currentPassword: form.get("currentPassword"),
        newPassword,
      });
      toast.success("Mot de passe mis à jour", {
        description: "Vos autres sessions actives ont été déconnectées.",
      });
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Changer votre mot de passe déconnecte automatiquement vos autres sessions actives.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {error && <FormMessage>{error}</FormMessage>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-new-password">Confirmer le nouveau mot de passe</Label>
            <Input id="confirm-new-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export { PasswordForm };
