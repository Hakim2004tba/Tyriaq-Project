"use client";

import * as React from "react";
import { UserPlus, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FormMessage } from "@/components/auth/form-message";
import { postJson, ApiError } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, STAFF_ROLES, type Role } from "@/lib/auth/roles";
import type { PublicUser } from "@/lib/auth/queries";

function InviteMemberDialog({ onCreated }: { onCreated: (user: PublicUser) => void }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  function reset() {
    setError(null);
    setResult(null);
    setCopied(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const data = await postJson<{ user: PublicUser; temporaryPassword: string }>(
        "/api/team",
        {
          name: form.get("name"),
          email: form.get("email"),
          role: form.get("role"),
        },
      );
      setResult({ email: data.user.email, password: data.temporaryPassword });
      onCreated(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Compte créé</DialogTitle>
              <DialogDescription>
                Partagez ce mot de passe temporaire avec {result.email} — il lui sera
                demandé de le changer dès sa première connexion.
              </DialogDescription>
            </DialogHeader>
            <div className="px-7 py-6">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-surface-sunken px-4 py-3">
                <code className="text-sm font-medium text-text-primary">{result.password}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(result.password).catch(() => {});
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="gold">Terminé</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ajouter un membre de l&rsquo;équipe</DialogTitle>
              <DialogDescription>
                Créez un compte pour un collaborateur et attribuez-lui un rôle.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-5 px-7 py-6">
              {error && <FormMessage>{error}</FormMessage>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-name">Nom complet</Label>
                <Input id="member-name" name="name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="member-email">Adresse e-mail</Label>
                <Input id="member-email" name="email" type="email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Rôle</Label>
                <Select name="role" defaultValue="commercial">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r): r is Role => STAFF_ROLES.includes(r)).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Annuler</Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { InviteMemberDialog };
