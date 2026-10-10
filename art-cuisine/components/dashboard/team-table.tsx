"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import { getJson, patchJson, ApiError } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import type { PublicUser } from "@/lib/auth/queries";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function TeamTable({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = React.useState<PublicUser[] | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await getJson<{ users: PublicUser[] }>("/api/team");
      setUsers(data.users);
    } catch {
      toast.error("Impossible de charger l'équipe.");
    }
  }, []);

  React.useEffect(() => {
    // Intentional client-side fetch-on-mount from this session's own API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function changeRole(id: string, role: Role) {
    setPending(id);
    try {
      await patchJson(`/api/team/${id}`, { role });
      toast.success("Rôle mis à jour");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(null);
    }
  }

  async function toggleActive(user: PublicUser) {
    setPending(user.id);
    try {
      await patchJson(`/api/team/${user.id}`, { active: !user.active });
      toast.success(user.active ? "Compte désactivé" : "Compte réactivé");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {users ? `${users.length} membre${users.length > 1 ? "s" : ""}` : "Chargement…"}
        </p>
        <InviteMemberDialog onCreated={() => load()} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Link href={`/dashboard/equipe/${user.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-text-primary">{user.name}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                {user.id === currentUserId ? (
                  <Badge variant="gold">{ROLE_LABELS[user.role as Role]}</Badge>
                ) : (
                  <Select
                    value={user.role}
                    disabled={pending === user.id}
                    onValueChange={(value) => changeRole(user.id, value as Role)}
                  >
                    <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? "success" : "neutral"}>
                  {user.active ? "Actif" : "Désactivé"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {user.id === currentUserId ? (
                  <span className="text-xs text-text-muted">Vous</span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending === user.id}
                    onClick={() => toggleActive(user)}
                  >
                    {user.active ? "Désactiver" : "Réactiver"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { TeamTable };
