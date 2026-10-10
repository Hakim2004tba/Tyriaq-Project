"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { updateEmployeeProfile } from "@/lib/actions/equipe";
import type { PublicUser } from "@/lib/auth/queries";
import type { EmployeeProfileRecord } from "@/lib/data/operations";

function toDateInputValue(iso: string): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function EditEmployeeDialog({ user, profile }: { user: PublicUser; profile: EmployeeProfileRecord }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateEmployeeProfile(user.id, {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      department: form.get("department"),
      hireDate: form.get("hireDate"),
      bio: form.get("bio"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Profil mis à jour");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Modifier le profil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>{user.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 px-7 py-6">
            {error && <FormMessage>{error}</FormMessage>}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-name">Nom complet</Label>
                <Input id="emp-name" name="name" defaultValue={user.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-email">E-mail</Label>
                <Input id="emp-email" name="email" type="email" defaultValue={user.email} required />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-phone">Téléphone</Label>
                <Input id="emp-phone" name="phone" defaultValue={profile.phone} placeholder="+213 5 55 00 00 00" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emp-department">Service</Label>
                <Input id="emp-department" name="department" defaultValue={profile.department} placeholder="Ex : Commercial, Atelier…" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="emp-hireDate">Date d&rsquo;embauche</Label>
              <Input id="emp-hireDate" name="hireDate" type="date" defaultValue={toDateInputValue(profile.hireDate)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="emp-bio">Notes / bio</Label>
              <Textarea id="emp-bio" name="bio" defaultValue={profile.bio} placeholder="Rôle au sein de l'équipe, spécialité…" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { EditEmployeeDialog };
