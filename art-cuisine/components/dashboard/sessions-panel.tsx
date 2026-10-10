"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Laptop, LogOut } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJson, deleteJson, postJson, ApiError } from "@/lib/api-client";
import { formatRelativeTime, describeUserAgent } from "@/lib/format";

interface SessionRow {
  tokenHash: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

function SessionsPanel() {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<SessionRow[] | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await getJson<{ sessions: SessionRow[] }>("/api/profile/sessions");
      setSessions(data.sessions);
    } catch {
      toast.error("Impossible de charger vos sessions.");
    }
  }, []);

  React.useEffect(() => {
    // Intentional client-side fetch-on-mount from this session's own API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function revoke(tokenHash: string) {
    setPending(tokenHash);
    try {
      await deleteJson(`/api/profile/sessions?tokenHash=${encodeURIComponent(tokenHash)}`);
      toast.success("Session déconnectée");
      if (sessions?.find((s) => s.tokenHash === tokenHash)?.isCurrent) {
        router.push("/login");
        router.refresh();
        return;
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(null);
    }
  }

  async function revokeOthers() {
    setPending("others");
    try {
      await postJson("/api/profile/sessions/revoke-others");
      toast.success("Les autres sessions ont été déconnectées");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions actives</CardTitle>
        <CardDescription>Les appareils actuellement connectés à votre compte.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!sessions && (
          <p className="text-sm text-text-muted">Chargement des sessions…</p>
        )}
        {sessions?.map((session) => (
          <div
            key={session.tokenHash}
            className="flex items-center justify-between gap-4 rounded-md border border-border-subtle px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
                <Laptop className="h-4 w-4" />
              </span>
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  {describeUserAgent(session.userAgent)}
                  {session.isCurrent && <Badge variant="success">Cet appareil</Badge>}
                </p>
                <p className="text-xs text-text-muted">
                  Actif {formatRelativeTime(session.lastSeenAt)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending === session.tokenHash}
              onClick={() => revoke(session.tokenHash)}
            >
              <LogOut className="h-3.5 w-3.5" />
              {session.isCurrent ? "Se déconnecter" : "Révoquer"}
            </Button>
          </div>
        ))}
      </CardContent>
      {sessions && sessions.length > 1 && (
        <CardFooter>
          <Button
            size="sm"
            variant="outline"
            disabled={pending === "others"}
            onClick={revokeOthers}
          >
            Déconnecter tous les autres appareils
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export { SessionsPanel };
