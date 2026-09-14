"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { PermissionPicker } from "@/components/permissions/permission-badge";
import { PERMISSION_META, type PermissionLevel } from "@/lib/data/permissions";
import { decideJoinRequest, type JoinRequest } from "@/lib/actions/space-link";

export interface ApprovableProject {
  id: string;
  name: string;
}

/**
 * Approving somebody, and deciding what they can reach.
 *
 * The space level is the default answer for every project in it, and for
 * most people it is the whole answer — so it sits at the top, already
 * chosen, and pressing Approve with nothing else touched does exactly
 * what the old one-click approval did.
 *
 * Underneath, each project can be told to differ. "Same as space" is not
 * a value copied from above: it means the project keeps following the
 * space, so changing the space level later moves it too. A project set
 * explicitly stops following, which is the point of setting it.
 */
export function ApproveDialog({
  request,
  spaceName,
  projects,
  onOpenChange,
  onDecided,
}: {
  request: JoinRequest | null;
  spaceName: string;
  projects: ApprovableProject[];
  onOpenChange: (open: boolean) => void;
  onDecided: (requestId: string) => void;
}) {
  const [level, setLevel] = useState<PermissionLevel>("editor");
  const [perProject, setPerProject] = useState<Record<string, PermissionLevel>>({});
  const [pending, startTransition] = useTransition();

  function decide(approve: boolean) {
    if (!request) return;
    startTransition(async () => {
      const result = await decideJoinRequest(request.id, approve, level, perProject);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        approve ? `${request.name} is in.` : `${request.name}'s request was declined.`
      );
      onDecided(request.id);
      onOpenChange(false);
      setPerProject({});
    });
  }

  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Let {request?.name ?? "them"} into {spaceName}?</DialogTitle>
          <DialogDescription>
            {request?.note
              ? `They said: “${request.note}”`
              : "They asked to join through a link."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-muted/40 px-3 py-2.5">
            <Avatar name={request?.name ?? ""} src={request?.avatarUrl ?? undefined} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm text-text-primary">
                Across the whole space
              </span>
              <span className="block text-caption text-text-muted">
                {PERMISSION_META[level].summary}
              </span>
            </span>
            <PermissionPicker level={level} source="space" onChange={setLevel} />
          </div>

          {projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-body-sm font-medium text-text-primary">
                Per project
              </p>
              <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
                {projects.map((project) => {
                  const override = perProject[project.id];
                  return (
                    <li key={project.id} className="flex items-center gap-2.5 px-2.5 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-text-primary">
                          {project.name}
                        </span>
                        <span className="block text-caption text-text-muted">
                          {override
                            ? PERMISSION_META[override].summary
                            : `Same as space — ${PERMISSION_META[level].label.toLowerCase()}`}
                        </span>
                      </span>

                      {override ? (
                        <>
                          <PermissionPicker
                            level={override}
                            source="project"
                            onChange={(next) =>
                              setPerProject((current) => ({ ...current, [project.id]: next }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPerProject((current) => {
                                const next = { ...current };
                                delete next[project.id];
                                return next;
                              })
                            }
                            className="shrink-0 rounded px-1.5 text-caption text-text-muted transition-colors
                                       hover:text-text-secondary focus-visible:outline-none focus-visible:shadow-focus"
                          >
                            Reset
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPerProject((current) => ({ ...current, [project.id]: "viewer" }))
                          }
                          className={cn(
                            "shrink-0 rounded-md border border-border px-2 py-1 text-caption text-text-secondary",
                            "transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:shadow-focus"
                          )}
                        >
                          Set separately
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" disabled={pending} onClick={() => decide(false)}>
            Decline
          </Button>
          <Button loading={pending} onClick={() => decide(true)}>
            <Check className="size-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
