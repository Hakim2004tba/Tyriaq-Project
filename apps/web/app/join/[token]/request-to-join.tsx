"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Button, Input, toast } from "@flow/ui";
import { requestToJoin } from "@/lib/actions/space-link";

/**
 * The ask.
 *
 * One optional line goes with it — "Hi, I'm the new designer" — because
 * the person approving is often looking at a name they do not recognise,
 * and a request with no context is one that sits in the queue.
 */
export function RequestToJoin({
  token,
  pending: alreadyAsked,
  spaceName,
}: {
  token: string;
  pending: boolean;
  spaceName: string;
}) {
  const [note, setNote] = useState("");
  const [asked, setAsked] = useState(alreadyAsked);
  const [pending, startTransition] = useTransition();

  if (asked) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <p className="flex items-start gap-2.5 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-body-sm text-text-secondary">
          <Clock className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
          <span>
            Your request to join <span className="text-text-primary">{spaceName}</span> is waiting.
            You will get a notification when somebody decides — there is nothing else to do here.
          </span>
        </p>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Go to Tyriaq</Link>
        </Button>
      </div>
    );
  }

  function ask() {
    startTransition(async () => {
      const result = await requestToJoin(token, note);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Optimism would be wrong here: the answer decides what the page
      // says next, and "asked" is not something to show before it is true.
      setAsked(true);
      toast.success(result.message ?? "Asked.");
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Say who you are (optional)"
        aria-label="A note for whoever approves this"
      />
      <Button loading={pending} onClick={ask}>
        Ask to join
      </Button>
    </div>
  );
}
