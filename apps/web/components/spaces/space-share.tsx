"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw, UserCheck, UserX } from "lucide-react";
import { Avatar, Button, toast } from "@flow/ui";
import {
  getSpaceJoinLink,
  listJoinRequests,
  resetSpaceJoinLink,
  type JoinRequest,
} from "@/lib/actions/space-link";
import { ApproveDialog, type ApprovableProject } from "./approve-dialog";

/**
 * The share link, and the queue it produces.
 *
 * One button does the whole first half: the link is minted on first
 * press and copied in the same gesture, because "generate" and "copy"
 * as two steps is two chances to walk away with nothing.
 *
 * The queue sits directly underneath rather than behind a tab. An admin
 * who just sent a link is the same person who will approve what comes
 * back, usually within the same day, and hiding the requests one click
 * away is how people end up not knowing anybody asked.
 */
export function SpaceShare({
  spaceId,
  spaceName,
  canManage,
  initialRequests,
  projects,
}: {
  spaceId: string;
  spaceName: string;
  canManage: boolean;
  initialRequests: JoinRequest[];
  projects: ApprovableProject[];
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [deciding, setDeciding] = useState<JoinRequest | null>(null);
  const [pending, startTransition] = useTransition();

  // The parent re-reads on refresh; keeping in step with it means an
  // approval elsewhere does not leave a stale row sitting here.
  useEffect(() => setRequests(initialRequests), [initialRequests]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is on screen to select.
      toast.info("Select the link and copy it.");
    }
  }

  function share() {
    if (url) {
      void copy(url);
      return;
    }
    startTransition(async () => {
      const result = await getSpaceJoinLink(spaceId);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Could not make a link.");
        return;
      }
      setUrl(result.url);
      await copy(result.url);
      toast.success("Link copied — send it to anyone.");
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetSpaceJoinLink(spaceId);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Could not replace the link.");
        return;
      }
      setUrl(result.url);
      await copy(result.url);
      toast.success(result.message ?? "New link copied.");
    });
  }

  if (!canManage) return null;


  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-muted/40 px-3 py-2.5">
        <p className="flex items-baseline justify-between gap-2">
          <span className="text-body-sm font-medium text-text-primary">Share this space</span>
          {url && (
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="flex items-center gap-1 text-caption text-text-muted transition-colors
                         hover:text-text-secondary focus-visible:outline-none focus-visible:text-text-secondary"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Replace link
            </button>
          )}
        </p>
        <p className="text-caption text-text-muted">
          Anyone with the link can ask to join. Nobody gets in until you say so.
        </p>

        {url ? (
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link to this space"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-caption
                         text-text-secondary outline-none focus-visible:shadow-focus"
            />
            <Button size="sm" variant="secondary" onClick={() => void copy(url)}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" loading={pending} onClick={share} className="self-start">
            <Link2 className="size-3.5" />
            Copy a link to this space
          </Button>
        )}
      </div>

      {requests.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-medium text-text-primary">Waiting on you</p>

          <ul className="flex flex-col divide-y divide-border rounded-md border border-warning/40">
            {requests.map((request) => (
              <li key={request.id} className="flex items-start gap-2.5 px-2.5 py-2">
                <Avatar name={request.name} src={request.avatarUrl ?? undefined} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text-primary">{request.name}</span>
                  <span className="block text-caption text-text-muted">
                    {request.note || "asked to join"}
                  </span>
                </span>

                {/*
                  One button, opening one decision.

                  Approving used to happen inline with a level chosen
                  above the list, which could not express "editor here,
                  viewer there" — and that is the question an admin
                  actually has when somebody new arrives.
                */}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setDeciding(request)}
                  className="shrink-0"
                >
                  <UserCheck className="size-3.5" />
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ApproveDialog
        request={deciding}
        spaceName={spaceName}
        projects={projects}
        onOpenChange={(open) => !open && setDeciding(null)}
        onDecided={(requestId) => {
          setRequests((current) => current.filter((r) => r.id !== requestId));
          // The roster above this changed too; ask the server for it.
          void listJoinRequests(spaceId).then(setRequests);
        }}
      />
    </div>
  );
}
