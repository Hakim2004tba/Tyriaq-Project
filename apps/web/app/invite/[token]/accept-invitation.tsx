"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, toast } from "@flow/ui";
import { acceptInvitation } from "@/lib/actions/invitation";

/**
 * The accept button.
 *
 * Warns BEFORE the click when the signed-in address is not the invited
 * one — the database refuses that case, and discovering it through an
 * error message after pressing a green button is a worse way to learn it.
 */
export function AcceptInvitation({
  token,
  signedInAs,
  invitedEmail,
}: {
  token: string;
  signedInAs: string;
  invitedEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mismatch = signedInAs.trim().toLowerCase() !== invitedEmail.trim().toLowerCase();

  if (mismatch) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <p className="rounded-md border border-warning/40 bg-warning-subtle px-3 py-2.5 text-body-sm text-text-secondary">
          You are signed in as <span className="text-text-primary">{signedInAs}</span>, but this
          invitation was sent to <span className="text-text-primary">{invitedEmail}</span>. Sign in
          with that address to accept it.
        </p>
        <Button variant="secondary" asChild>
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
            Sign in as {invitedEmail}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Button
      className="mt-5 w-full"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptInvitation(token);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          router.push("/dashboard");
          router.refresh();
        })
      }
    >
      Join the workspace
    </Button>
  );
}
