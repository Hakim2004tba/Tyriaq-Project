"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { FormMessage } from "@/components/auth/form-message";
import { patchJson, ApiError } from "@/lib/api-client";
import type { SessionUser } from "@/lib/auth/session";

function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      await patchJson("/api/profile", {
        name: form.get("name"),
        email: form.get("email"),
      });
      toast.success("Profil mis à jour");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Votre nom et votre adresse e-mail de connexion.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {error && <FormMessage>{error}</FormMessage>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Nom complet</Label>
            <Input id="profile-name" name="name" defaultValue={user.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email">Adresse e-mail</Label>
            <Input id="profile-email" name="email" type="email" defaultValue={user.email} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export { ProfileForm };
