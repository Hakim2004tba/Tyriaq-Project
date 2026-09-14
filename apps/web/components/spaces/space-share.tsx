"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw, UserCheck, UserX } from "lucide-react";
import { Avatar, Button, toast } from "@flow/ui";
import { PermissionPicker } from "@/components/permissions/permission-badge";
import { PERMISSION_META, type PermissionLevel } from "@/lib/data/permissions";
import {
  decideJoinRequest,
  getSpaceJoinLink,
  listJoinRequests,
  resetSpaceJoinLink,
  type JoinRequest,
} from "@/lib/actions/space-link";

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
  canManage,
  initialRequests,
}: {
  spaceId: string;
  canManage: boolean;
  initialRequests: JoinRequest[];
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [level, setLevel] = useState<PermissionLevel>("editor");
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

  function decide(request: JoinRequest, approve: boolean) {
    // Optimistic: the row leaves the queue, and comes back if refused.
    const previous = requests;
    setRequests((current) => current.filter((r) => r.id !== request.id));

    startTransition(async () => {
      const result = await decideJoinRequest(request.id, approve, level);
      if (result.error) {
        setRequests(previous);
        toast.error(result.error);
        return;
      }
      toast.success(
        approve
          ? `${request.name} is in as ${PERMISSION_META[level].label.toLowerCase()}.`
          : `${request.name}'s request was declined.`
      );
      // Refreshing the roster is the parent's job; ask for it.
      void listJoinRequests(spaceId).then(setRequests);
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
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-body-sm font-medium text-text-primary">
              Waiting on you
            </span>
            {/*
              The level is chosen once, above the list, rather than per
              row: approving five people from one link almost always
              means five people at the same level, and a picker on every
              row would be five decisions to make the same choice.
            */}
            <PermissionPicker level={level} source="space" onChange={setLevel} />
          </p>

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

                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => decide(request, true)}
                  >
                    <UserCheck className="size-3.5" />
                    Approve
                  </Button>
                  <button
                    type="button"
                    onClick={() => decide(request, false)}
                    disabled={pending}
                    aria-label={`Decline ${request.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-text-muted
                               transition-colors hover:bg-danger-subtle hover:text-danger
                               focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <UserX className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
